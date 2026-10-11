import type { ScalingPath } from "@prisma/client";

// Skala (#331): reach more people, in a way that holds. Five steps — who
// else and where, how you grow (four ways), the core (what must stay the
// same everywhere, what may be adapted), the first new place and money to
// grow — then the gate. Pure: the page, the signals and the gate read the
// same rules from here.

// Old SCALE keys reused where the meaning holds (ticks and cards carry
// over); "Kärnan" is new. new_geographies_identified is folded into the
// first step.
export const SKALA_STEPS = ["scaling_goals_set", "scale_vs_fork_decided", "core_defined", "local_teams_or_license", "expansion_capital_secured"] as const;
export type SkalaStep = (typeof SKALA_STEPS)[number];

export const SCALING_PATHS: readonly ScalingPath[] = ["SELF", "OTHERS", "HANDOVER", "OPEN"];
// Ways where others start their own — the project is opened for that.
export const OPENS_REPLICATION: readonly ScalingPath[] = ["OTHERS", "OPEN"];

const filled = (v: string | null | undefined) => !!v?.trim();

export type SkalaData = {
  plan: {
    goals?: string | null;
    geographies?: string | null;
    growthPath?: ScalingPath | null;
    coreFixed?: string | null;
    teamOrLicenseModel?: string | null;
    capitalPlan?: string | null;
  } | null;
  // Opened for replication or a local group started before #331: the way
  // was in practice already chosen.
  replicationOpened: boolean;
  approvedInstance: boolean;
};

export function skalaStepsDone({ plan, replicationOpened, approvedInstance }: SkalaData): Record<SkalaStep, boolean> {
  return {
    scaling_goals_set: filled(plan?.goals) && filled(plan?.geographies),
    scale_vs_fork_decided: !!plan?.growthPath || replicationOpened,
    core_defined: filled(plan?.coreFixed),
    local_teams_or_license: approvedInstance || filled(plan?.teamOrLicenseModel),
    expansion_capital_secured: filled(plan?.capitalPlan),
  };
}
