// Lansering (#327): run the pilot, learn and decide. Four steps — start the
// pilot (the plan from Uppstart, a metric per success criterion, a start
// date), follow it (the log, the metrics), what it showed (an outcome per
// criterion) and the plan forward — then the gate. Pure: the page, the
// signals and the gate read the same rules from here.

// The step keys reuse the old Lansering checklist keys, so ticks and cards
// tagged with them carry over: pilot_success_criteria is now "Starta
// piloten", launch_marketing_plan_created "Plan framåt".
export const LANSERING_STEPS = ["pilot_success_criteria", "pilot_executed_documented", "pilot_results_collected", "launch_marketing_plan_created"] as const;
export type LanseringStep = (typeof LANSERING_STEPS)[number];

// Match MIN_LOG_ENTRIES in lib/phaseGate.ts and phaseProgress.ts.
export const MIN_PILOT_LOG_ENTRIES = 3;

export const OUTCOMES = ["MET", "PARTLY", "NOT_MET"] as const;
export type Outcome = (typeof OUTCOMES)[number];
export const OUTCOME_ICON: Record<Outcome, string> = { MET: "✓", PARTLY: "◐", NOT_MET: "✗" };

export type CriterionResult = { criterion: string; metricId?: string | null; outcome?: Outcome | null; note?: string | null };

// The success criteria are free text (Uppstart step 4): one per line, with
// or without a bullet. A line in parentheses is a note, e.g. the AI's
// "(Förslag från AI:n — justera nivåerna.)".
export function parseCriteria(text: string | null | undefined): string[] {
  return (text ?? "")
    .split("\n")
    .map((l) => l.trim().replace(/^([-•*]|\d+[.)])\s*/, "").trim())
    .filter((l) => l && !/^\(.*\)$/.test(l));
}

const norm = (v: string) => v.toLowerCase().replace(/\s+/g, " ").trim();

function isOutcome(v: unknown): v is Outcome {
  return typeof v === "string" && (OUTCOMES as readonly string[]).includes(v);
}

// The stored results, read defensively (it's a Json column).
export function readResults(raw: unknown): CriterionResult[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && typeof (r as { criterion?: unknown }).criterion === "string")
    .map((r) => ({
      criterion: String(r.criterion),
      metricId: typeof r.metricId === "string" ? r.metricId : null,
      outcome: isOutcome(r.outcome) ? r.outcome : null,
      note: typeof r.note === "string" ? r.note : null,
    }));
}

// One result per current criterion, matched by text; a criterion that was
// reworded simply starts without a result.
export function resultsFor(criteria: string[], raw: unknown): CriterionResult[] {
  const stored = readResults(raw);
  return criteria.map((criterion) => stored.find((r) => norm(r.criterion) === norm(criterion)) ?? { criterion, metricId: null, outcome: null, note: null });
}

// The stored list with one criterion's result changed (others kept,
// including results for criteria no longer in the text — they may come back).
export function withResult(raw: unknown, criterion: string, change: Partial<Omit<CriterionResult, "criterion">>): CriterionResult[] {
  const stored = readResults(raw);
  const i = stored.findIndex((r) => norm(r.criterion) === norm(criterion));
  if (i < 0) return [...stored, { criterion, metricId: null, outcome: null, note: null, ...change }];
  return stored.map((r, j) => (j === i ? { ...r, ...change } : r));
}

export type OutcomeCounts = { total: number; assessed: number } & Record<Outcome, number>;

export function outcomeCounts(results: CriterionResult[]): OutcomeCounts {
  const counts: OutcomeCounts = { total: results.length, assessed: 0, MET: 0, PARTLY: 0, NOT_MET: 0 };
  for (const r of results) if (r.outcome) {
    counts[r.outcome]++;
    counts.assessed++;
  }
  return counts;
}

export function logEntries(log: string | null | undefined): number {
  return (log ?? "").split("\n").filter((l) => l.trim()).length;
}

const filled = (v: string | null | undefined) => !!v?.trim();

export type LanseringData = {
  evaluation: { successCriteria?: string | null; startedAt?: Date | null; executionNotes?: string | null; criteriaResults?: unknown } | null;
  launch: { targetAudience?: string | null; howToReach?: string | null } | null;
};

// Which of the four steps the data shows as done.
export function lanseringStepsDone({ evaluation, launch }: LanseringData): Record<LanseringStep, boolean> {
  const criteria = parseCriteria(evaluation?.successCriteria);
  const results = resultsFor(criteria, evaluation?.criteriaResults);
  return {
    pilot_success_criteria: criteria.length > 0 && !!evaluation?.startedAt,
    pilot_executed_documented: logEntries(evaluation?.executionNotes) >= MIN_PILOT_LOG_ENTRIES,
    pilot_results_collected: criteria.length > 0 && results.every((r) => !!r.outcome),
    launch_marketing_plan_created: filled(launch?.targetAudience) && filled(launch?.howToReach),
  };
}
