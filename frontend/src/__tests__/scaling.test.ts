import { skalaStepsDone } from "../lib/scaling";

describe("Skala steps (#331)", () => {
  const plan = { goals: "20 promenadpar", geographies: "Hässelby, Vällingby och Spånga", growthPath: "OTHERS" as const, coreFixed: "- Samma dag varje vecka", teamOrLicenseModel: "", capitalPlan: "Fika och material, ca 5 000 kr per ny plats" };

  it("each step follows its own data", () => {
    expect(skalaStepsDone({ plan, replicationOpened: true, approvedInstance: true })).toEqual({
      scaling_goals_set: true,
      scale_vs_fork_decided: true,
      core_defined: true,
      local_teams_or_license: true,
      expansion_capital_secured: true,
    });
  });

  it("goals need both who and where; the first place is a text or an approved local group", () => {
    const steps = skalaStepsDone({ plan: { ...plan, geographies: " " }, replicationOpened: false, approvedInstance: false });
    expect(steps.scaling_goals_set).toBe(false);
    expect(steps.local_teams_or_license).toBe(false);
    expect(skalaStepsDone({ plan: { ...plan, teamOrLicenseModel: "En liten pilot i Spånga" }, replicationOpened: false, approvedInstance: false }).local_teams_or_license).toBe(true);
  });

  it("a project opened for replication before #331 has chosen its way", () => {
    expect(skalaStepsDone({ plan: null, replicationOpened: true, approvedInstance: false }).scale_vs_fork_decided).toBe(true);
    expect(skalaStepsDone({ plan: null, replicationOpened: false, approvedInstance: false }).scale_vs_fork_decided).toBe(false);
  });
});
