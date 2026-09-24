import type Anthropic from "@anthropic-ai/sdk";
import type { AiInsightKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAiClientFor } from "@/lib/aiMode";
import { getFieldProvenance } from "@/lib/fieldProvenance";
import { LEAN_CANVAS_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { VALUE_PROPOSITION_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/value-proposition/fields";
import {
  CRITIQUE_SYSTEM_PROMPT,
  CRITIQUE_TOOL,
  INTERVIEW_SYNTHESIS_SYSTEM_PROMPT,
  INTERVIEW_SYNTHESIS_TOOL,
} from "@/lib/prompts/ideaInsights";

const MODEL = "claude-sonnet-4-6";
const REQUEST_OPTIONS = { timeout: 90_000, maxRetries: 1 };

// Canvas fields are addressed as "<entity>.<field>" in insights, e.g.
// "leanCanvas.problem" — the same entity/field pair FieldProvenance uses.
export const CANVAS_FIELD_KEYS: readonly string[] = [
  ...LEAN_CANVAS_FIELDS.map((f) => `leanCanvas.${f}`),
  ...VALUE_PROPOSITION_FIELDS.map((f) => `valueProposition.${f}`),
];

export function splitFieldKey(key: string): { entity: "leanCanvas" | "valueProposition"; field: string } | null {
  const [entity, field] = key.split(".");
  if ((entity === "leanCanvas" || entity === "valueProposition") && field && CANVAS_FIELD_KEYS.includes(key)) {
    return { entity, field };
  }
  return null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// ─── Kritikern ──────────────────────────────────────────────────────────────

export type CritiquePoint = { text: string; field: string | null; severity: "high" | "medium" };
export type CritiqueContent = { points: CritiquePoint[] };

export function coerceCritique(raw: unknown): CritiqueContent {
  const points = Array.isArray((raw as { points?: unknown })?.points) ? (raw as { points: unknown[] }).points : [];
  return {
    points: points
      .map((p) => {
        const o = (p ?? {}) as Record<string, unknown>;
        const field = str(o.field);
        return {
          text: str(o.text),
          // An unknown field key is dropped, not trusted — the point stays.
          field: field && CANVAS_FIELD_KEYS.includes(field) ? field : null,
          severity: o.severity === "high" ? ("high" as const) : ("medium" as const),
        };
      })
      .filter((p) => p.text)
      .slice(0, 3),
  };
}

// ─── Intervjusammanfattning ─────────────────────────────────────────────────

export type Verdict = {
  field: string;
  verdict: "confirmed" | "refuted" | "unclear";
  reason: string;
  interviewIds: string[];
};
export type SynthesisContent = { learnings: string[]; verdicts: Verdict[]; interviewCount: number };

// Grounding is enforced here: a verdict must be about an assumption we
// asked about and cite interviews that exist; "confirmed"/"refuted" with
// no valid citation is downgraded to "unclear" rather than trusted.
export function coerceSynthesis(raw: unknown, assumptionKeys: Set<string>, interviewIds: Set<string>): Omit<SynthesisContent, "interviewCount"> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const learnings = Array.isArray(o.learnings) ? o.learnings.map(str).filter(Boolean).slice(0, 5) : [];
  const verdicts: Verdict[] = [];
  const seen = new Set<string>();
  for (const v of Array.isArray(o.verdicts) ? o.verdicts : []) {
    const r = (v ?? {}) as Record<string, unknown>;
    const field = str(r.field);
    if (!assumptionKeys.has(field) || seen.has(field)) continue;
    const ids = Array.isArray(r.interview_ids) ? [...new Set(r.interview_ids.map(str).filter((id) => interviewIds.has(id)))] : [];
    const claimed = r.verdict === "confirmed" || r.verdict === "refuted" ? r.verdict : "unclear";
    verdicts.push({ field, verdict: ids.length ? claimed : "unclear", reason: str(r.reason), interviewIds: ids });
    seen.add(field);
  }
  return { learnings, verdicts };
}

// ─── Running them ───────────────────────────────────────────────────────────

async function callTool(client: Anthropic, system: string, tool: Anthropic.Tool, content: string): Promise<unknown> {
  const response = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 3000,
      system,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content }],
    },
    REQUEST_OPTIONS,
  );
  const toolUse = response.content.find((b) => b.type === "tool_use");
  return toolUse && toolUse.type === "tool_use" ? toolUse.input : null;
}

function canvasText(entity: string, row: Record<string, unknown> | null, fields: readonly string[]): string {
  return fields.map((f) => `${entity}.${f}: ${str(row?.[f]) || "(tomt)"}`).join("\n");
}

export class InsightError extends Error {}

// Kritikern: runs automatically after the Idé fill (AGENT), and on request
// ("Granska igen"). userId null for the automatic run (bounded, once per
// project); the project's monthly AI budget applies either way.
export async function runCritique(projectId: string, userId: string | null): Promise<CritiqueContent> {
  const gate = await getAiClientFor({ feature: "critique", kind: "assist", userId, projectId, language: "project" });
  if (!gate.ok) throw new InsightError(gate.reason);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      title: true, summary: true, description: true, slug: true, leanCanvas: true, valueProposition: true,
      marketScanEntries: { select: { name: true, type: true, description: true } },
    },
  });
  if (!project) throw new InsightError("not_found");

  const content =
    `Projekt: ${project.title}\nSammanfattning: ${project.summary ?? ""}\nBeskrivning: ${(project.description ?? "").replace(/<[^>]*>/g, " ")}\n\n` +
    `Lean Canvas:\n${canvasText("leanCanvas", project.leanCanvas as Record<string, unknown> | null, LEAN_CANVAS_FIELDS)}\n\n` +
    `Värdeerbjudande:\n${canvasText("valueProposition", project.valueProposition as Record<string, unknown> | null, VALUE_PROPOSITION_FIELDS)}\n\n` +
    `Omvärldsbevakning:\n${project.marketScanEntries.map((e) => `- ${e.name} (${e.type}): ${e.description}`).join("\n") || "(inget)"}`;

  const critique = coerceCritique(await callTool(gate.client, CRITIQUE_SYSTEM_PROMPT, CRITIQUE_TOOL, content));
  if (!critique.points.length) throw new InsightError("empty");
  await prisma.aiInsight.create({ data: { projectId, kind: "CRITIQUE", content: critique as unknown as Prisma.InputJsonValue } });
  return critique;
}

// The canvas fields still marked as assumptions (ANTAR, or never marked —
// untouched text counts as an assumption) that have content.
export async function currentAssumptions(projectId: string, slug: string): Promise<{ key: string; text: string }[]> {
  const [lc, vp, lcProv, vpProv] = await Promise.all([
    prisma.leanCanvas.findUnique({ where: { projectSlug: slug } }),
    prisma.valueProposition.findUnique({ where: { projectSlug: slug } }),
    getFieldProvenance(projectId, "leanCanvas"),
    getFieldProvenance(projectId, "valueProposition"),
  ]);
  const out: { key: string; text: string }[] = [];
  for (const f of LEAN_CANVAS_FIELDS) {
    const text = str((lc as Record<string, unknown> | null)?.[f]);
    if (text && lcProv[f]?.status !== "VET") out.push({ key: `leanCanvas.${f}`, text });
  }
  for (const f of VALUE_PROPOSITION_FIELDS) {
    const text = str((vp as Record<string, unknown> | null)?.[f]);
    if (text && vpProv[f]?.status !== "VET") out.push({ key: `valueProposition.${f}`, text });
  }
  return out;
}

export async function runInterviewSynthesis(projectId: string, slug: string, userId: string): Promise<SynthesisContent> {
  const interviews = await prisma.interviewLogEntry.findMany({
    where: { projectSlug: slug },
    orderBy: { date: "asc" },
    select: { id: true, date: true, personaName: true, painPoint: true, validated: true, quotes: true },
  });
  if (!interviews.length) throw new InsightError("no_interviews");

  const gate = await getAiClientFor({ feature: "critique", kind: "assist", userId, projectId, stepKey: "target_audience_interviews", language: "project" });
  if (!gate.ok) throw new InsightError(gate.reason);

  const assumptions = await currentAssumptions(projectId, slug);
  const content =
    `Intervjuer:\n${interviews
      .map(
        (i) =>
          `[${i.id}] ${i.personaName} (${i.date.toISOString().slice(0, 10)}) — problem enligt personen: ${i.painPoint}` +
          `${i.quotes ? ` — citat/anteckningar: ${i.quotes}` : ""} — initiativtagaren bedömde problemet som ${i.validated ? "bekräftat" : "inte bekräftat"}`,
      )
      .join("\n")}\n\n` +
    `Antaganden:\n${assumptions.map((a) => `${a.key}: ${a.text}`).join("\n") || "(inga)"}`;

  const parsed = coerceSynthesis(
    await callTool(gate.client, INTERVIEW_SYNTHESIS_SYSTEM_PROMPT, INTERVIEW_SYNTHESIS_TOOL, content),
    new Set(assumptions.map((a) => a.key)),
    new Set(interviews.map((i) => i.id)),
  );
  const synthesis: SynthesisContent = { ...parsed, interviewCount: interviews.length };
  await prisma.aiInsight.create({ data: { projectId, kind: "INTERVIEW_SYNTHESIS", content: synthesis as unknown as Prisma.InputJsonValue } });
  return synthesis;
}

export async function latestInsight<T>(projectId: string, kind: AiInsightKind): Promise<{ content: T; createdAt: Date } | null> {
  const row = await prisma.aiInsight.findFirst({ where: { projectId, kind }, orderBy: { createdAt: "desc" } });
  return row ? { content: row.content as unknown as T, createdAt: row.createdAt } : null;
}
