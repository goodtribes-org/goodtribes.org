import type { PhaseGateOutcome, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAiClientFor } from "@/lib/aiMode";
import { getFieldProvenance } from "@/lib/fieldProvenance";
import { parseOpenQuestions } from "@/lib/dreamConversation";
import { CANVAS_FIELD_KEYS, InsightError, latestInsight, type CritiqueContent, type SynthesisContent } from "@/lib/ideaInsights";
import { LEAN_CANVAS_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { VALUE_PROPOSITION_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/value-proposition/fields";
import {
  ETABLERA_GATE_SYSTEM_PROMPT,
  ETABLERA_GATE_TOOL,
  LANSERING_GATE_SYSTEM_PROMPT,
  LANSERING_GATE_TOOL,
  PHASE_GATE_SYSTEM_PROMPT,
  PHASE_GATE_TOOL,
  UPPSTART_GATE_SYSTEM_PROMPT,
  UPPSTART_GATE_TOOL,
} from "@/lib/prompts/ideaInsights";

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
  // Lansering → Etablera only: a verdict per pilot success criterion.
  criteriaVerdicts: CriterionVerdict[];
};

export type CriterionVerdict = { criterion: string; verdict: "met" | "not_met" | "unclear"; evidence: string };

function criteriaVerdicts(v: unknown): CriterionVerdict[] {
  return (Array.isArray(v) ? v : [])
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const verdict = o.verdict === "met" || o.verdict === "not_met" ? o.verdict : "unclear";
      return {
        criterion: typeof o.criterion === "string" ? o.criterion.trim() : "",
        verdict,
        evidence: typeof o.evidence === "string" ? o.evidence.trim() : "",
      } as CriterionVerdict;
    })
    .filter((c) => c.criterion)
    .slice(0, 6);
}

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
    criteriaVerdicts: criteriaVerdicts(o.criteria),
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

// ─── Lansering → Etablera (pilotens go/no-go) ───────────────────────────────

// Checklist keys again. Each counts as met by what the project actually
// has (criteria written, log entries, a results summary, a launch plan,
// workflows, metrics) or when someone ticked it. The go/no-go step itself
// (pilot_go_no_go) is what this gate records, so it isn't a criterion.
export const LANSERING_GATE_CRITERIA = [
  "pilot_success_criteria",
  "pilot_executed_documented",
  "pilot_results_collected",
  "impact_measurement_setup",
  "launch_marketing_plan_created",
  "workflows_formalized",
] as const;

export const MIN_LOG_ENTRIES = 3;

export function logEntryCount(log: string | null | undefined): number {
  return (log ?? "").split("\n").filter((l) => l.trim()).length;
}

export async function lanseringGateCriteria(projectId: string, slug: string): Promise<{ criteria: GateCriteria; logCount: number }> {
  const [done, evaluation, metricCount, launch, workflows] = await Promise.all([
    prisma.initiativeChecklistItem.findMany({
      where: { projectId, completedAt: { not: null }, itemKey: { in: [...LANSERING_GATE_CRITERIA] } },
      select: { itemKey: true },
    }),
    prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true, executionNotes: true, resultsSummary: true } }),
    prisma.impactMetric.count({ where: { projectSlug: slug } }),
    prisma.launchPlan.findUnique({ where: { projectSlug: slug }, select: { targetAudience: true, positioning: true } }),
    prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: slug, slug: "arbetsfloden" } }, select: { id: true } }),
  ]);
  const doneKeys = new Set(done.map((d) => d.itemKey));
  const logCount = logEntryCount(evaluation?.executionNotes);
  const has: Record<(typeof LANSERING_GATE_CRITERIA)[number], boolean> = {
    pilot_success_criteria: !!evaluation?.successCriteria?.trim(),
    pilot_executed_documented: logCount >= MIN_LOG_ENTRIES,
    pilot_results_collected: !!evaluation?.resultsSummary?.trim(),
    impact_measurement_setup: metricCount > 0,
    launch_marketing_plan_created: !!(launch?.targetAudience?.trim() || launch?.positioning?.trim()),
    workflows_formalized: !!workflows,
  };
  return { logCount, criteria: LANSERING_GATE_CRITERIA.map((key) => ({ key, met: doneKeys.has(key) || has[key] })) };
}

export async function runLanseringGateBrief(projectId: string, slug: string, userId: string): Promise<GateBrief> {
  const gate = await getAiClientFor({ feature: "critique", kind: "assist", userId, projectId });
  if (!gate.ok) throw new InsightError(gate.reason);

  const [project, evaluation, metrics, launch, workflows, roles, previous] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { title: true, summary: true } }),
    prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true, executionNotes: true, resultsSummary: true } }),
    prisma.impactMetric.findMany({
      where: { projectSlug: slug },
      select: { label: true, unit: true, targetValue: true, currentValue: true, updates: { orderBy: { createdAt: "asc" }, select: { value: true, note: true, createdAt: true } } },
    }),
    prisma.launchPlan.findUnique({ where: { projectSlug: slug }, include: { channels: { select: { name: true } } } }),
    prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: slug, slug: "arbetsfloden" } }, select: { content: true } }),
    prisma.projectRoleNeed.findMany({ where: { projectId }, select: { title: true, filledById: true } }),
    latestInsight<GateBrief>(projectId, "UPPSTART_GATE"),
  ]);
  if (!project) throw new InsightError("not_found");
  const strip = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const content = [
    `Projekt: ${project.title} — ${project.summary ?? ""}`,
    `Framgångskriterier:\n${evaluation?.successCriteria?.trim() || "(inga angivna)"}`,
    `Pilotlogg:\n${evaluation?.executionNotes?.trim() || "(inget loggat)"}`,
    evaluation?.resultsSummary?.trim() ? `Resultatsammanfattning:\n${evaluation.resultsSummary}` : "Ingen resultatsammanfattning.",
    `Impact-mätetal:\n${
      metrics
        .map(
          (m) =>
            `${m.label}: ${m.currentValue} ${m.unit}${m.targetValue ? ` (mål ${m.targetValue})` : ""}${
              m.updates.length
                ? ` — uppdateringar: ${m.updates.map((u) => `${u.createdAt.toISOString().slice(0, 10)} ${u.value}${u.note ? ` (${u.note})` : ""}`).join(", ")}`
                : " — inga rapporterade värden"
            }`,
        )
        .join("\n") || "(inga)"
    }`,
    launch
      ? `Lanseringsplan: målgrupp ${launch.targetAudience ?? "—"}; budskap ${launch.positioning ?? "—"}; kanaler ${launch.channels.map((c) => c.name).join(", ") || "—"}`
      : "Ingen lanseringsplan.",
    workflows ? `Arbetsflöden och ansvar: ${strip(workflows.content).slice(0, 1500)}` : "Arbetsflöden och ansvar är inte beskrivna.",
    `Kärnteam: ${roles.length ? roles.map((r) => `${r.title} (${r.filledById ? "tillsatt" : "vakant"})`).join(", ") : "inga roller definierade"}`,
    previous ? `Fokus som sattes för piloten vid förra fasgrinden: ${previous.content.nextFocus.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await gate.client.messages.create(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: LANSERING_GATE_SYSTEM_PROMPT,
      tools: [LANSERING_GATE_TOOL],
      tool_choice: { type: "tool", name: LANSERING_GATE_TOOL.name },
      messages: [{ role: "user", content }],
    },
    { timeout: 90_000, maxRetries: 1 },
  );
  const toolUse = response.content.find((b) => b.type === "tool_use");
  const brief = coerceGateBrief(toolUse && toolUse.type === "tool_use" ? toolUse.input : null);
  if (!brief.reasons.length && !brief.learned.length) throw new InsightError("empty");
  await prisma.aiInsight.create({ data: { projectId, kind: "LANSERING_GATE", content: brief as unknown as Prisma.InputJsonValue } });
  return brief;
}

// ADJUST: measure what's still unclear. PIVOT: fix the criteria the pilot
// didn't meet. Pure, like the other two.
export function cardsForLanseringDecision(
  outcome: PhaseGateOutcome,
  brief: GateBrief | null,
  words: { unclear: string; unclearWhy: string; notMet: string; notMetWhy: string } = {
    unclear: "Mät",
    unclearWhy: "Piloten gav inte tillräckligt underlag för det här framgångskriteriet. Fortsätt piloten och mät det.",
    notMet: "Åtgärda",
    notMetWhy: "Piloten nådde inte det här framgångskriteriet. Ta reda på varför och ändra lösningen innan nästa försök.",
  },
): { title: string; description: string }[] {
  if (outcome === "ADJUST") {
    const open = [...new Set(brief?.unanswered ?? [])].map((q) => ({
      title: `Ta reda på: ${q}`.slice(0, 200),
      description: "Det här behövs för att kunna bedöma läget. Ta reda på det innan nästa beslut.",
    }));
    const unclear = [...new Set(brief?.criteriaVerdicts.filter((c) => c.verdict === "unclear").map((c) => c.criterion) ?? [])].map((c) => ({
      title: `${words.unclear}: ${c}`.slice(0, 200),
      description: words.unclearWhy,
    }));
    return [...open, ...unclear];
  }
  if (outcome === "PIVOT") {
    return [...new Set(brief?.criteriaVerdicts.filter((c) => c.verdict === "not_met").map((c) => c.criterion) ?? [])].map((c) => ({
      title: `${words.notMet}: ${c}`.slice(0, 200),
      description: words.notMetWhy,
    }));
  }
  return [];
}

// What the gate decision means for the pilot's own go/no-go field.
export function pilotDecisionFor(outcome: PhaseGateOutcome): "GO" | "NO_GO" | null {
  if (outcome === "CONTINUE") return "GO";
  if (outcome === "PIVOT" || outcome === "PAUSE") return "NO_GO";
  return null;
}

// ─── Etablera → Skala ───────────────────────────────────────────────────────

export const ETABLERA_GATE_CRITERIA = [
  "process_scaled_up",
  "stable_operations_funding",
  "funding_secured",
  "partnerships_formalized",
  "supporter_base_built",
  "playbook_documented",
  "review_council_deep_review",
] as const;

export const ETABLERA_CARD_WORDS = {
  unclear: "Stärk",
  unclearWhy: "Underlaget räcker inte för att säga att det här är på plats. Stärk det innan ni skalar.",
  notMet: "Åtgärda",
  notMetWhy: "Det här saknas för att projektet ska klara att växa. Lös det innan ni skalar.",
};

// Checklist keys; each counts as met when ticked, or when the project's
// own data shows it (funding applied for or pledged, funding awarded, an
// active partnership, a playbook page, a completed council review).
export async function etableraGateCriteria(projectId: string, slug: string): Promise<{ criteria: GateCriteria }> {
  const [done, campaign, applications, partnerships, playbook, review] = await Promise.all([
    prisma.initiativeChecklistItem.findMany({
      where: { projectId, completedAt: { not: null }, itemKey: { in: [...ETABLERA_GATE_CRITERIA] } },
      select: { itemKey: true },
    }),
    prisma.fundingCampaign.findUnique({ where: { projectId }, select: { id: true, _count: { select: { pledges: { where: { pledgeStatus: "confirmed" } } } } } }),
    prisma.fundingApplication.findMany({ where: { projectId, status: { in: ["submitted", "awarded"] } }, select: { status: true } }),
    prisma.partnership.count({ where: { projectId, status: "active" } }),
    prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: slug, slug: "playbook" } }, select: { id: true } }),
    prisma.reviewCouncilRequest.findFirst({ where: { projectId, status: "completed" }, select: { id: true } }),
  ]);
  const doneKeys = new Set(done.map((d) => d.itemKey));
  const has: Partial<Record<(typeof ETABLERA_GATE_CRITERIA)[number], boolean>> = {
    stable_operations_funding: !!campaign || applications.length > 0,
    funding_secured: applications.some((a) => a.status === "awarded") || (campaign?._count.pledges ?? 0) > 0,
    partnerships_formalized: partnerships > 0,
    playbook_documented: !!playbook,
    review_council_deep_review: !!review,
  };
  return { criteria: ETABLERA_GATE_CRITERIA.map((key) => ({ key, met: doneKeys.has(key) || !!has[key] })) };
}

export async function runEtableraGateBrief(projectId: string, slug: string, userId: string): Promise<GateBrief> {
  const gate = await getAiClientFor({ feature: "critique", kind: "assist", userId, projectId });
  if (!gate.ok) throw new InsightError(gate.reason);

  const [project, plan, wikis, campaign, applications, partnerships, review, metrics, roles, previous] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { title: true, summary: true } }),
    prisma.establishmentPlan.findUnique({ where: { projectSlug: slug }, select: { scaledProcessNotes: true, supporterBaseNotes: true } }),
    prisma.wikiPage.findMany({ where: { projectSlug: slug, slug: { in: ["finansieringsplan", "partnerskap", "playbook"] } }, select: { slug: true, content: true } }),
    prisma.fundingCampaign.findUnique({
      where: { projectId },
      select: { title: true, goal: true, currency: true, status: true, pledges: { where: { pledgeStatus: "confirmed" }, select: { amount: true } } },
    }),
    prisma.fundingApplication.findMany({ where: { projectId }, select: { status: true, amountRequestedSek: true, outcome: true, outcomeAmountSek: true, fundingSource: { select: { name: true } } } }),
    prisma.partnership.findMany({ where: { projectId }, select: { type: true, status: true, description: true, organisation: { select: { name: true } } } }),
    prisma.reviewCouncilRequest.findFirst({ where: { projectId }, orderBy: { createdAt: "desc" }, select: { status: true, outcomeNote: true } }),
    prisma.impactMetric.findMany({ where: { projectSlug: slug }, select: { label: true, unit: true, currentValue: true, targetValue: true, _count: { select: { updates: true } } } }),
    prisma.projectRoleNeed.findMany({ where: { projectId }, select: { title: true, filledById: true } }),
    latestInsight<GateBrief>(projectId, "LANSERING_GATE"),
  ]);
  if (!project) throw new InsightError("not_found");
  const strip = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wiki = (s: string) => wikis.find((w) => w.slug === s)?.content;
  const pledged = campaign?.pledges.reduce((sum, p) => sum + p.amount, 0) ?? 0;

  const content = [
    `Projekt: ${project.title} — ${project.summary ?? ""}`,
    plan ? `Etableringsplan:\nDrift: ${plan.scaledProcessNotes ?? "—"}\nSupporterbas: ${plan.supporterBaseNotes ?? "—"}` : "Ingen etableringsplan.",
    wiki("finansieringsplan") ? `Finansieringsplan: ${strip(wiki("finansieringsplan")!).slice(0, 1200)}` : "Ingen finansieringsplan.",
    campaign ? `Insamlingskampanj "${campaign.title}" (${campaign.status}): ${pledged} av ${campaign.goal} ${campaign.currency} insamlat` : "Ingen insamlingskampanj.",
    applications.length
      ? `Ansökningar: ${applications.map((a) => `${a.fundingSource.name}: ${a.status}${a.amountRequestedSek ? `, sökt ${a.amountRequestedSek} kr` : ""}${a.outcomeAmountSek ? `, beviljat ${a.outcomeAmountSek} kr` : ""}${a.outcome ? ` (${a.outcome})` : ""}`).join("; ")}`
      : "Inga finansieringsansökningar.",
    partnerships.length
      ? `Partnerskap: ${partnerships.map((p) => `${p.organisation.name} (${p.type}, ${p.status})${p.description ? ` — ${p.description}` : ""}`).join("; ")}`
      : "Inga registrerade partnerskap.",
    wiki("partnerskap") ? `Partnerskapsplan: ${strip(wiki("partnerskap")!).slice(0, 800)}` : "",
    wiki("playbook") ? `Playbook finns: ${strip(wiki("playbook")!).slice(0, 600)} …` : "Ingen playbook.",
    review ? `Granskningsrådet: ${review.status}${review.outcomeNote ? ` — ${review.outcomeNote}` : ""}` : "Ingen granskning begärd.",
    `Impact: ${metrics.map((m) => `${m.label} ${m.currentValue} ${m.unit}${m.targetValue ? ` (mål ${m.targetValue})` : ""}${m._count.updates ? "" : " — inte rapporterat"}`).join("; ") || "inga mätetal"}`,
    `Kärnteam: ${roles.map((r) => `${r.title} (${r.filledById ? "tillsatt" : "vakant"})`).join(", ") || "inga roller definierade"}`,
    previous ? `Fokus som sattes för Etablera vid pilotens go/no-go: ${previous.content.nextFocus.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await gate.client.messages.create(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: ETABLERA_GATE_SYSTEM_PROMPT,
      tools: [ETABLERA_GATE_TOOL],
      tool_choice: { type: "tool", name: ETABLERA_GATE_TOOL.name },
      messages: [{ role: "user", content }],
    },
    { timeout: 90_000, maxRetries: 1 },
  );
  const toolUse = response.content.find((b) => b.type === "tool_use");
  const brief = coerceGateBrief(toolUse && toolUse.type === "tool_use" ? toolUse.input : null);
  if (!brief.reasons.length && !brief.learned.length) throw new InsightError("empty");
  await prisma.aiInsight.create({ data: { projectId, kind: "ETABLERA_GATE", content: brief as unknown as Prisma.InputJsonValue } });
  return brief;
}
