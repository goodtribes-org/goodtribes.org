import type { PhaseGateOutcome, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAiClientFor } from "@/lib/aiMode";
import { getFieldProvenance } from "@/lib/fieldProvenance";
import { parseOpenQuestions } from "@/lib/dreamConversation";
import { CANVAS_FIELD_KEYS, InsightError, latestInsight, type CritiqueContent, type SynthesisContent } from "@/lib/ideaInsights";
import { LEAN_CANVAS_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { VALUE_PROPOSITION_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/value-proposition/fields";
import { PHASE_GATE_SYSTEM_PROMPT, PHASE_GATE_TOOL, UPPSTART_GATE_SYSTEM_PROMPT, UPPSTART_GATE_TOOL } from "@/lib/prompts/ideaInsights";

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

export type GateCriteria = { key: string; met: boolean }[];

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
  // Uppstart → Lansering only (empty at the Idé gate): sprint questions the
  // tests didn't answer, and proposed pilot success criteria.
  unanswered: string[];
  successCriteria: string[];
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
    unanswered: list(o.unanswered, 4),
    successCriteria: list(o.success_criteria, 4),
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

// ─── Uppstart → Lansering ───────────────────────────────────────────────────

// Checklist keys, so the labels are the ones the phase menu already uses.
// "Testa med användare" counts as met by what the sprint actually
// collected (test feedback), or when someone ticked it.
export const UPPSTART_GATE_CRITERIA = [
  "core_team_formed",
  "test_with_users",
  "kanban_seeded",
  "rough_budget_estimated",
  "pilot_scope_defined",
] as const;

export const MIN_TEST_FEEDBACK = 3;

export async function uppstartGateCriteria(projectId: string, slug: string): Promise<{ criteria: GateCriteria; feedbackCount: number }> {
  const [done, feedbackCount, roles] = await Promise.all([
    prisma.initiativeChecklistItem.findMany({
      where: { projectId, completedAt: { not: null }, itemKey: { in: [...UPPSTART_GATE_CRITERIA] } },
      select: { itemKey: true },
    }),
    prisma.sprintContribution.count({ where: { type: "FEEDBACK", sprintPhase: { phase: "VALIDATE", sprint: { projectSlug: slug } } } }),
    prisma.projectRoleNeed.findMany({ where: { projectId }, select: { filledById: true } }),
  ]);
  const doneKeys = new Set(done.map((d) => d.itemKey));
  const rolesFilled = roles.length > 0 && roles.every((r) => r.filledById);
  return {
    feedbackCount,
    criteria: UPPSTART_GATE_CRITERIA.map((key) => ({
      key,
      met:
        key === "test_with_users"
          ? doneKeys.has(key) || feedbackCount >= MIN_TEST_FEEDBACK
          : key === "core_team_formed"
            ? doneKeys.has(key) || rolesFilled
            : doneKeys.has(key),
    })),
  };
}

const SPRINT_PHASE_LABEL: Record<string, string> = {
  UNDERSTAND: "Kartlägga & förstå",
  DIVERGE: "Skissa lösningar",
  DECIDE: "Beslut & planera",
  PROTOTYPE: "Bygga prototyp",
  VALIDATE: "Testa med användare",
};

export async function runUppstartGateBrief(projectId: string, slug: string, userId: string): Promise<GateBrief> {
  const gate = await getAiClientFor({ feature: "critique", kind: "assist", userId, projectId });
  if (!gate.ok) throw new InsightError(gate.reason);

  const [project, lcProv, vpProv, sprint, sprintPlan, plan, roles, { feedbackCount }] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { title: true, summary: true, leanCanvas: true, valueProposition: true } }),
    getFieldProvenance(projectId, "leanCanvas"),
    getFieldProvenance(projectId, "valueProposition"),
    prisma.sprint.findFirst({
      where: { projectSlug: slug },
      orderBy: { createdAt: "desc" },
      select: {
        name: true,
        currentPhase: true,
        status: true,
        phases: {
          select: {
            phase: true,
            contributions: { orderBy: { createdAt: "asc" }, select: { type: true, content: true, _count: { select: { votes: true } } } },
          },
        },
      },
    }),
    prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: slug, slug: "sprintplan" } }, select: { content: true } }),
    prisma.projectPlan.findUnique({ where: { projectSlug: slug }, select: { goal: true, resources: true } }),
    prisma.projectRoleNeed.findMany({ where: { projectId }, select: { title: true, filledById: true } }),
    uppstartGateCriteria(projectId, slug),
  ]);
  if (!project) throw new InsightError("not_found");

  // The fields a sprint tests: the solution side of both canvases.
  const SOLUTION_FIELDS = new Set(["solution", "uniqueValueProposition", "channels", "earlyAdopters", "concept", "vpProducts", "vpRelievers", "vpCreators"]);
  const fieldLines = (entity: string, row: Record<string, unknown> | null, fields: readonly string[], prov: Record<string, { status: string }>) =>
    fields
      .filter((f) => SOLUTION_FIELDS.has(f) && typeof row?.[f] === "string" && (row[f] as string).trim())
      .map((f) => `${entity}.${f} [${prov[f]?.status === "VET" ? "VET" : "ANTAR"}]: ${row![f]}`)
      .join("\n");
  const strip = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const sprintText = sprint
    ? [
        `Sprint: ${sprint.name} (nu i steget ${SPRINT_PHASE_LABEL[sprint.currentPhase]}${sprint.status === "COMPLETED" ? ", avslutad" : ""})`,
        ...sprint.phases.map(
          (ph) =>
            `${SPRINT_PHASE_LABEL[ph.phase]}:\n${
              ph.contributions.map((c) => `- [${c.type}${c._count.votes ? `, ${c._count.votes} röster` : ""}] ${c.content}`).join("\n") || "(inga bidrag)"
            }`,
        ),
        `Antal feedback-bidrag från testpersoner: ${feedbackCount}`,
      ].join("\n")
    : "Ingen Design Sprint har gjorts.";

  const content = [
    `Projekt: ${project.title} — ${project.summary ?? ""}`,
    sprintPlan ? `Sprintplan: ${strip(sprintPlan.content)}` : "Ingen sprintplan.",
    sprintText,
    `Canvasens lösningsfält:\n${fieldLines("leanCanvas", project.leanCanvas as Record<string, unknown> | null, LEAN_CANVAS_FIELDS, lcProv)}\n${fieldLines("valueProposition", project.valueProposition as Record<string, unknown> | null, VALUE_PROPOSITION_FIELDS, vpProv)}`,
    plan?.goal ? `Projektplanens mål och avgränsning: ${plan.goal}` : "",
    `Kärnteam: ${roles.length ? roles.map((r) => `${r.title} (${r.filledById ? "tillsatt" : "vakant"})`).join(", ") : "inga roller definierade"}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await gate.client.messages.create(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: UPPSTART_GATE_SYSTEM_PROMPT,
      tools: [UPPSTART_GATE_TOOL],
      tool_choice: { type: "tool", name: UPPSTART_GATE_TOOL.name },
      messages: [{ role: "user", content }],
    },
    { timeout: 90_000, maxRetries: 1 },
  );
  const toolUse = response.content.find((b) => b.type === "tool_use");
  const brief = coerceGateBrief(toolUse && toolUse.type === "tool_use" ? toolUse.input : null);
  if (!brief.reasons.length && !brief.learned.length) throw new InsightError("empty");
  await prisma.aiInsight.create({ data: { projectId, kind: "UPPSTART_GATE", content: brief as unknown as Prisma.InputJsonValue } });
  return brief;
}

// ADJUST: test the sprint questions still open. PIVOT: rework the
// solution fields that didn't hold. Pure, like cardsForDecision.
export function cardsForUppstartDecision(
  outcome: PhaseGateOutcome,
  brief: GateBrief | null,
  labelFor: (key: string) => string,
): { title: string; description: string }[] {
  if (outcome === "ADJUST") {
    return [...new Set(brief?.unanswered ?? [])].map((q) => ({
      title: `Testa: ${q}`.slice(0, 200),
      description: "Sprinten gav inget svar på den här frågan. Testa den igen — med fler testpersoner eller en ändrad prototyp.",
    }));
  }
  if (outcome === "PIVOT") {
    return [...new Set(brief?.fell ?? [])].map((key) => ({
      title: `Omarbeta lösningen: ${labelFor(key)}`,
      description: "Testerna motsäger det här antagandet om lösningen. Tänk om, skriv om fältet och testa igen.",
    }));
  }
  return [];
}
