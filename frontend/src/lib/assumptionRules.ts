import type { AssumptionRisk, AssumptionStatus } from "@prisma/client";
import { namesAreGrounded } from "@/lib/grounding";

// Pure rules for the Idé phase's assumptions (docs/plans/ide-iteration.md,
// PR B) — no Prisma client, no AI, so every rule is unit-testable. The
// "what to do next" card, the gate criterion and the interview hints are
// deliberately rules, not AI calls: they're cheap, instant and predictable,
// and the AI budget is kept for the things that need judgement.

export type AssumptionLike = {
  id: string;
  risk: AssumptionRisk;
  status: AssumptionStatus;
  sourceEntity: string | null;
  sourceField: string | null;
  createdAt: Date;
};

const RISK_ORDER: Record<AssumptionRisk, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export function isOpen(status: AssumptionStatus): boolean {
  return status === "UNTESTED" || status === "TESTING";
}

// Open ones first (riskiest first — that's what to test next), then the
// tested ones. Within a group: an assumption already being tested before an
// untested one, then oldest first.
export function sortAssumptions<T extends AssumptionLike>(list: T[]): T[] {
  return [...list].sort(
    (a, b) =>
      Number(!isOpen(a.status)) - Number(!isOpen(b.status)) ||
      RISK_ORDER[a.risk] - RISK_ORDER[b.risk] ||
      Number(a.status !== "TESTING") - Number(b.status !== "TESTING") ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

// "Det viktigaste nu": the riskiest assumption not yet tested.
export function nextAssumptionToTest<T extends AssumptionLike>(list: T[]): T | null {
  const first = sortAssumptions(list)[0];
  return first && isOpen(first.status) ? first : null;
}

// Gate criterion "risky_assumptions_tested": the team has written down its
// assumptions, tested at least one, and left no HIGH-risk one open. Advisory
// like every gate criterion — shown and recorded, never enforced.
export function riskyAssumptionsTested(list: AssumptionLike[]): boolean {
  if (!list.some((a) => !isOpen(a.status))) return false;
  return !list.some((a) => a.risk === "HIGH" && isOpen(a.status));
}

export type SynthesisVerdict = { field: string; verdict: "confirmed" | "refuted" | "unclear"; reason: string };
export type StatusHint = { assumptionId: string; status: "SUPPORTED" | "REFUTED"; reason: string };

// The interview synthesis judges whole canvas fields ("leanCanvas.x
// confirmed"). An open assumption sitting behind that field gets a hint to
// update its status — a hint only: whether a field-level verdict really
// settles one concrete assumption is the team's call.
export function statusHintsFromSynthesis(list: AssumptionLike[], verdicts: SynthesisVerdict[]): StatusHint[] {
  const byField = new Map(verdicts.filter((v) => v.verdict !== "unclear").map((v) => [v.field, v]));
  return list.flatMap((a) => {
    if (!isOpen(a.status) || !a.sourceEntity || !a.sourceField) return [];
    const v = byField.get(`${a.sourceEntity}.${a.sourceField}`);
    if (!v) return [];
    return [{ assumptionId: a.id, status: v.verdict === "confirmed" ? ("SUPPORTED" as const) : ("REFUTED" as const), reason: v.reason }];
  });
}

export const RISKS: readonly AssumptionRisk[] = ["HIGH", "MEDIUM", "LOW"];
export const STATUSES: readonly AssumptionStatus[] = ["UNTESTED", "TESTING", "SUPPORTED", "REFUTED"];
export const MAX_ASSUMPTION_TEXT = 500;
export const MAX_ASSUMPTION_NOTE = 2000;

export type AssumptionProposal = { text: string; risk: AssumptionRisk; testPlan: string | null; fieldKey: string | null };

// "Hitta antaganden" output → clean proposals. Drops anything naming
// something not in the source ("hitta aldrig på fakta", same check as
// Kritikern), unknown field keys become null, duplicates of what the team
// already has (same text, ignoring case) are skipped.
export function parseAssumptionProposals(
  input: unknown,
  source: string,
  validFieldKeys: readonly string[],
  existingTexts: string[],
): AssumptionProposal[] {
  const raw = (input as { assumptions?: unknown } | null)?.assumptions;
  if (!Array.isArray(raw)) return [];
  const seen = new Set(existingTexts.map((t) => t.trim().toLowerCase()));
  const out: AssumptionProposal[] = [];
  for (const item of raw) {
    const o = (item ?? {}) as { text?: unknown; risk?: unknown; test?: unknown; field?: unknown; names?: unknown };
    const text = typeof o.text === "string" ? o.text.trim().slice(0, MAX_ASSUMPTION_TEXT) : "";
    if (!text || seen.has(text.toLowerCase())) continue;
    if (!namesAreGrounded(o.names, source)) continue;
    const risk = o.risk === "high" ? "HIGH" : o.risk === "low" ? "LOW" : "MEDIUM";
    const testPlan = typeof o.test === "string" && o.test.trim() ? o.test.trim().slice(0, MAX_ASSUMPTION_NOTE) : null;
    const fieldKey = typeof o.field === "string" && validFieldKeys.includes(o.field) ? o.field : null;
    seen.add(text.toLowerCase());
    out.push({ text, risk, testPlan, fieldKey });
  }
  return out.slice(0, 7);
}
