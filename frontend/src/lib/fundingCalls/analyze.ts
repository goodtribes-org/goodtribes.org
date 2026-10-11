import type { FundingApplicantType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAiClientFor, type AiGateBlockReason } from "@/lib/aiMode";
import { wrapUntrusted } from "@/lib/untrusted";
import { shortQuote, type Provenance } from "./types";

// Utlysningar (#343): "Föreslå med AI" on an imported call, pressed by a
// site admin — never run automatically, so the cost follows real use. The
// AI reads only the source's own short texts and suggests our fields, each
// with the quote it rests on. A suggestion is kept only if its quote really
// is in the source text (grounded, like Kritikern's names), and only for
// fields that are still empty. The admin checks everything before publishing.
//
// ÖPPEN FRÅGA (#342): AI budget is per project, and a call has no project.
// Until there is a platform budget this runs without one, behind the
// funding-calls-ai flag and the per-user rate limit only.

const MODEL = "claude-sonnet-4-6";

export const APPLICANT_TYPES: FundingApplicantType[] = ["COMPANY", "NONPROFIT", "UNIVERSITY", "MUNICIPALITY", "PUBLIC_AGENCY", "CONSORTIUM", "INDIVIDUAL", "OTHER"];

const SYSTEM = `Du läser en utlysning från en finansiär och fyller i strukturerade fält åt GoodTribes, en plattform där människor tar fram projekt tillsammans.
Regler:
- Använd bara det som står i texten. Hitta aldrig på belopp, datum, krav eller målgrupper.
- Varje fält du fyller i ska ha ett ordagrant citat ur texten (högst 200 tecken) som visar var uppgiften står.
- Lämna ett fält tomt om texten inte säger det.
- Sammanfattningen är 3–5 meningar på enkel svenska: vad man kan söka för, vem som kan söka och vad som krävs.
- Belopp anges i kronor som heltal.`;

const quoted = (schema: object) => ({ type: "object", properties: { value: schema, quote: { type: "string" } }, required: ["value", "quote"] });

const TOOL = {
  name: "utlysning",
  description: "De strukturerade fälten för utlysningen, vart och ett med citat.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: quoted({ type: "string" }),
      applicantTypes: quoted({ type: "array", items: { type: "string", enum: APPLICANT_TYPES } }),
      amountMinSek: quoted({ type: "integer" }),
      amountMaxSek: quoted({ type: "integer" }),
      totalBudgetSek: quoted({ type: "integer" }),
      cofunding: quoted({ type: "string" }),
      projectLengthMonths: quoted({ type: "integer" }),
      sdgGoals: quoted({ type: "array", items: { type: "integer", minimum: 1, maximum: 17 } }),
      tags: quoted({ type: "array", items: { type: "string" } }),
      requirements: quoted({ type: "array", items: { type: "string" } }),
      stateAidRule: quoted({ type: "string" }),
    },
  },
};

const norm = (s: string) => s.toLowerCase().replace(/[\s"”“'’.,;:!?()–-]+/g, " ").trim();

// A quote counts only if it is really in the source text.
export function isGrounded(quote: unknown, source: string): quote is string {
  if (typeof quote !== "string" || norm(quote).length < 4) return false;
  return norm(source).includes(norm(quote));
}

type Field = keyof typeof TOOL.input_schema.properties;
type Suggestion = Partial<Record<Field, { value: unknown; quote: unknown }>>;

const isEmpty = (v: unknown) => v === null || v === undefined || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);

// Which suggested values may be written: grounded, valid, into empty fields.
export function acceptSuggestion(
  suggestion: Suggestion,
  current: Record<Field, unknown>,
  source: string,
  url: string | null,
): { data: Partial<Record<Field, unknown>>; provenance: Provenance } {
  const data: Partial<Record<Field, unknown>> = {};
  const provenance: Provenance = {};
  for (const [field, s] of Object.entries(suggestion) as [Field, { value: unknown; quote: unknown }][]) {
    if (!s || isEmpty(s.value) || !isEmpty(current[field])) continue;
    // The summary is our own wording, so it can't be quoted word for word —
    // it's checked by the admin instead.
    if (field !== "summary" && !isGrounded(s.quote, source)) continue;
    let value = s.value;
    if (field === "applicantTypes") value = (value as unknown[]).filter((v): v is FundingApplicantType => APPLICANT_TYPES.includes(v as FundingApplicantType));
    if (field === "sdgGoals") value = (value as unknown[]).filter((v) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 17);
    if (["amountMinSek", "amountMaxSek", "totalBudgetSek", "projectLengthMonths"].includes(field) && !(Number.isInteger(value) && (value as number) > 0)) continue;
    if (isEmpty(value)) continue;
    data[field] = value;
    const quote = shortQuote(typeof s.quote === "string" ? s.quote : null);
    if (quote) provenance[field] = { quote, url };
  }
  return { data, provenance };
}

export async function suggestCallFields(callId: string, userId: string): Promise<{ ok: true; filled: number } | { ok: false; reason: AiGateBlockReason | "empty" | "not_found" }> {
  const call = await prisma.fundingCall.findUnique({ where: { id: callId }, include: { fundingSource: { select: { name: true } } } });
  if (!call) return { ok: false, reason: "not_found" };
  const source = [call.title, call.sourceDescription, call.eligibilityText, call.amountText].filter(Boolean).join("\n\n");
  if (!source.trim()) return { ok: false, reason: "empty" };
  const gate = await getAiClientFor({ feature: "funding-calls", kind: "assist", userId, projectId: null });
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const response = await gate.client.messages.create(
    {
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: `Finansiär: ${call.fundingSource.name}\n\n${wrapUntrusted("utlysningens text", source)}` }],
    },
    { timeout: 90_000, maxRetries: 1 },
  );
  const toolUse = response.content.find((b) => b.type === "tool_use");
  const suggestion = (toolUse && toolUse.type === "tool_use" ? toolUse.input : {}) as Suggestion;
  const { data, provenance } = acceptSuggestion(suggestion, call as unknown as Record<Field, unknown>, source, call.url);
  await prisma.fundingCall.update({
    where: { id: call.id },
    data: {
      ...(data as Prisma.FundingCallUpdateInput),
      aiSuggestedAt: new Date(),
      provenance: { ...((call.provenance as Provenance | null) ?? {}), ...provenance } as Prisma.InputJsonValue,
    },
  });
  return { ok: true, filled: Object.keys(data).length };
}
