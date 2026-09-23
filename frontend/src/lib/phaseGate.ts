import type { PhaseGateOutcome, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAiClientFor } from "@/lib/aiMode";
import { getFieldProvenance } from "@/lib/fieldProvenance";
import { parseOpenQuestions } from "@/lib/dreamConversation";
import { CANVAS_FIELD_KEYS, InsightError, latestInsight, type CritiqueContent, type SynthesisContent } from "@/lib/ideaInsights";
import { LEAN_CANVAS_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { VALUE_PROPOSITION_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/value-proposition/fields";
import { PHASE_GATE_SYSTEM_PROMPT, PHASE_GATE_TOOL } from "@/lib/prompts/ideaInsights";

// ─── Gate criteria (Idé → Uppstart) ─────────────────────────────────────────

// What the Idé phase should have produced before moving on. The gate is a
// decision point, not a lock: unmet criteria are shown and recorded with
// the decision ("went ahead without interviews"), never enforced.
export const IDEA_GATE_CRITERIA = [
  "dream_defined",
  "ai_reviewed",
  "lean_canvas_created",
  "value_proposition_created",
  "market_scan_partners",
  "target_audience_interviews",
] as const;
export type IdeaGateCriterion = (typeof IDEA_GATE_CRITERIA)[number];

export const MIN_INTERVIEWS = 3;

export type GateCriteria = { key: IdeaGateCriterion; met: boolean }[];

export async function ideaGateCriteria(projectId: string, slug: string): Promise<{ criteria: GateCriteria; interviewCount: number }> {
  const [done, interviewCount] = await Promise.all([
    prisma.initiativeChecklistItem.findMany({
      where: { projectId, completedAt: { not: null }, itemKey: { in: [...IDEA_GATE_CRITERIA] } },
      select: { itemKey: true },
    }),
    prisma.interviewLogEntry.count({ where: { projectSlug: slug } }),
  ]);
  const doneKeys = new Set(done.map((d) => d.itemKey));
  return {
    interviewCount,
    criteria: IDEA_GATE_CRITERIA.map((key) => ({
      key,
      // Interviews count by what's actually logged, not by a checkbox.
      met: key === "target_audience_interviews" ? interviewCount >= MIN_INTERVIEWS : doneKeys.has(key),
    })),
  };
}

export function missingCriteria(criteria: GateCriteria): string[] {
  return criteria.filter((c) => !c.met).map((c) => c.key);
}

// ─── Decision brief ─────────────────────────────────────────────────────────

export type GateRecommendation = "continue" | "adjust" | "pivot" | "pause";
export type GateBrief = {
  believed: string[];
  learned: string[];
  held: string[];
  fell: string[];
  recommendation: GateRecommendation;
  reasons: string[];
  nextFocus: string[];
};

function list(v: unknown, max: number): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim()).slice(0, max) : [];
}

// held/fell must be real canvas field keys, and a field can't both hold
// and fall; the recommendation defaults to "adjust" (the cautious one).
export function coerceGateBrief(raw: unknown): GateBrief {
  const o = (raw ?? {}) as Record<string, unknown>;
  const fell = [...new Set(list(o.fell, 26).filter((k) => CANVAS_FIELD_KEYS.includes(k)))];
  const held = [...new Set(list(o.held, 26).filter((k) => CANVAS_FIELD_KEYS.includes(k) && !fell.includes(k)))];
  const rec = o.recommendation;
  return {
    believed: list(o.believed, 4),
    learned: list(o.learned, 5),
    held,
    fell,
    recommendation: rec === "continue" || rec === "pivot" || rec === "pause" ? rec : "adjust",
    reasons: list(o.reasons, 4),
    nextFocus: list(o.next_focus, 3),
  };
}

export async function runGateBrief(projectId: string, slug: string, userId: string): Promise<GateBrief> {
  const gate = await getAiClientFor({ feature: "critique", kind: "assist", userId, projectId });
  if (!gate.ok) throw new InsightError(gate.reason);

  const [project, lcProv, vpProv, synthesis, critique, { interviewCount }] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { title: true, summary: true, leanCanvas: true, valueProposition: true, dreamConversation: { select: { openQuestions: true } } },
    }),
    getFieldProvenance(projectId, "leanCanvas"),
    getFieldProvenance(projectId, "valueProposition"),
    latestInsight<SynthesisContent>(projectId, "INTERVIEW_SYNTHESIS"),
    latestInsight<CritiqueContent>(projectId, "CRITIQUE"),
    ideaGateCriteria(projectId, slug),
  ]);
  if (!project) throw new InsightError("not_found");

  const fieldLines = (entity: string, row: Record<string, unknown> | null, fields: readonly string[], prov: Record<string, { status: string }>) =>
    fields
      .filter((f) => typeof row?.[f] === "string" && (row[f] as string).trim())
      .map((f) => `${entity}.${f} [${prov[f]?.status === "VET" ? "VET" : "ANTAR"}]: ${row![f]}`)
      .join("\n");

  const content = [
    `Projekt: ${project.title} — ${project.summary ?? ""}`,
    `Antal loggade intervjuer: ${interviewCount}`,
    `Canvasfält:\n${fieldLines("leanCanvas", project.leanCanvas as Record<string, unknown> | null, LEAN_CANVAS_FIELDS, lcProv)}\n${fieldLines("valueProposition", project.valueProposition as Record<string, unknown> | null, VALUE_PROPOSITION_FIELDS, vpProv)}`,
    synthesis
      ? `Intervjusammanfattning (${synthesis.content.interviewCount} intervjuer):\nLärdomar: ${synthesis.content.learnings.join(" | ")}\nUtlåtanden: ${synthesis.content.verdicts.map((v) => `${v.field}=${v.verdict} (${v.reason})`).join(" | ")}`
      : "Ingen intervjusammanfattning finns.",
    critique ? `Kritikerns invändningar: ${critique.content.points.map((p) => p.text).join(" | ")}` : "",
    `Öppna frågor: ${parseOpenQuestions(project.dreamConversation?.openQuestions).join(" | ") || "inga"}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await gate.client.messages.create(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: PHASE_GATE_SYSTEM_PROMPT,
      tools: [PHASE_GATE_TOOL],
      tool_choice: { type: "tool", name: PHASE_GATE_TOOL.name },
      messages: [{ role: "user", content }],
    },
    { timeout: 90_000, maxRetries: 1 },
  );
  const toolUse = response.content.find((b) => b.type === "tool_use");
  const brief = coerceGateBrief(toolUse && toolUse.type === "tool_use" ? toolUse.input : null);
  if (!brief.reasons.length && !brief.learned.length) throw new InsightError("empty");
  await prisma.aiInsight.create({ data: { projectId, kind: "PHASE_GATE", content: brief as unknown as Prisma.InputJsonValue } });
  return brief;
}

// ─── What each decision does besides being recorded ─────────────────────────

// The cards an ADJUST / PIVOT decision creates: the assumptions that need
// testing (unclear) or reworking (contradicted), from the latest interview
// synthesis and brief. Pure so it can be unit tested.
export function cardsForDecision(
  outcome: PhaseGateOutcome,
  synthesis: SynthesisContent | null,
  brief: GateBrief | null,
  labelFor: (key: string) => string,
): { title: string; description: string }[] {
  if (outcome === "ADJUST") {
    const unclear = synthesis?.verdicts.filter((v) => v.verdict === "unclear").map((v) => v.field) ?? [];
    return [...new Set(unclear)].map((key) => ({
      title: `Testa antagandet: ${labelFor(key)}`,
      description: "Intervjuerna gav inget tydligt svar. Hitta ett sätt att testa det — fler intervjuer eller ett litet experiment.",
    }));
  }
  if (outcome === "PIVOT") {
    const contradicted = [
      ...(synthesis?.verdicts.filter((v) => v.verdict === "refuted").map((v) => v.field) ?? []),
      ...(brief?.fell ?? []),
    ];
    return [...new Set(contradicted)].map((key) => ({
      title: `Omarbeta: ${labelFor(key)}`,
      description: "Underlaget motsäger det här antagandet. Tänk om och skriv om fältet.",
    }));
  }
  return [];
}
