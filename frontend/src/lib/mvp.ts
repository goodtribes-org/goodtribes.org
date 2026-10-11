import type { MvpSignal, MvpType } from "@prisma/client";

// Uppstart (#320): test whether anyone wants it — fast, with the smallest
// version of the idea, and without a method to learn first. Four steps:
// what we test (a hypothesis), the smallest version, people trying it (one
// MvpTest each, with how strong a signal it gave) and the pilot plan. The
// strongest evidence is someone paying; the team decides whether to go on
// on weaker evidence — the gate only says how strong it is.

export const UPPSTART_STEPS = ["mvp_hypothesis", "mvp_built", "mvp_tested", "pilot_planned"] as const;
export type UppstartStep = (typeof UPPSTART_STEPS)[number];

export const MVP_TYPES: readonly MvpType[] = ["MANUAL", "EVENT", "PROTOTYPE", "SIGNUP", "OTHER"];
// Weakest first.
export const MVP_SIGNALS: readonly MvpSignal[] = ["LIKED", "CONTINUE", "HELPING", "PAID"];
export const MVP_SIGNAL_ICON: Record<MvpSignal, string> = { LIKED: "💬", CONTINUE: "✋", HELPING: "🤝", PAID: "💰" };

// Enough people to say something, few enough to do in a couple of weeks.
export const MIN_MVP_TESTS = 3;

export type UppstartPlanFields = {
  hypothesis?: string | null;
  mvpType?: MvpType | null;
  mvpDescription?: string | null;
  pilotWhere?: string | null;
  pilotWho?: string | null;
  pilotDuration?: string | null;
};

const filled = (v: string | null | undefined) => !!v?.trim();

// Which of the four steps the data already shows as done.
export function uppstartStepsDone(plan: UppstartPlanFields | null | undefined, testCount: number, successCriteria: string | null | undefined): Record<UppstartStep, boolean> {
  return {
    mvp_hypothesis: filled(plan?.hypothesis),
    mvp_built: !!plan?.mvpType && filled(plan?.mvpDescription),
    mvp_tested: testCount >= MIN_MVP_TESTS,
    pilot_planned: filled(plan?.pilotWhere) && filled(plan?.pilotWho) && filled(plan?.pilotDuration) && filled(successCriteria),
  };
}

export type EvidenceStrength = "none" | "weak" | "some" | "strong";
export type Evidence = { total: number; counts: Record<MvpSignal, number>; strength: EvidenceStrength };

// How strong the tests are, in words a gate can say plainly: anyone paying
// is strong; people wanting to go on or helping is some; only opinions is
// weak.
export function evidenceSummary(signals: readonly MvpSignal[]): Evidence {
  const counts = { LIKED: 0, CONTINUE: 0, HELPING: 0, PAID: 0 } as Record<MvpSignal, number>;
  for (const s of signals) counts[s]++;
  const strength: EvidenceStrength =
    signals.length === 0 ? "none" : counts.PAID > 0 ? "strong" : counts.CONTINUE + counts.HELPING > 0 ? "some" : "weak";
  return { total: signals.length, counts, strength };
}
