jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));
jest.mock("../lib/aiParticipant", () => ({ getAiParticipantUser: jest.fn() }));

import {
  coerceMvp,
  coercePilotPlan,
  coerceTasks,
  emptyOnly,
  isUppstartFillInProgress,
  parseUppstartStatus,
  PILOT_PLAN_FIELDS,
} from "../lib/uppstartFill";

describe("parseUppstartStatus", () => {
  it("keeps only known sections and states", () => {
    expect(parseUppstartStatus({ mvp: "done", tasks: "running", team: "done", plan: "weird" })).toEqual({ mvp: "done", tasks: "running" });
  });

  it("shows a section still waiting after 5 minutes as failed", () => {
    const updated = new Date("2026-09-24T10:00:00Z");
    const later = updated.getTime() + 6 * 60_000;
    expect(parseUppstartStatus({ mvp: "running", tasks: "done" }, updated, later)).toEqual({ mvp: "failed", tasks: "done" });
    expect(isUppstartFillInProgress(parseUppstartStatus({ mvp: "running" }, updated, later))).toBe(false);
    expect(isUppstartFillInProgress({ plan: "pending" })).toBe(true);
  });
});

describe("tasks", () => {
  it("drops untitled entries and caps the count", () => {
    expect(coerceTasks(null)).toEqual([]);
    expect(coerceTasks({ tasks: Array(10).fill({ title: "Hitta fem personer som kan prova" }) })).toHaveLength(7);
  });
});

describe("the smallest version (#320)", () => {
  const words = { hypWe: "Vi tror att", hypWant: "vill", hypKnow: "och vi vet det när" };
  it("puts the hypothesis together from its three parts and keeps a known type", () => {
    expect(
      coerceMvp({ hypothesis_who: " småbarnsföräldrar ", hypothesis_what: "låna en båt", hypothesis_sign: "fem familjer bokar.", mvp_type: "EVENT", mvp_description: "En träff i föreningslokalen." }, words),
    ).toEqual({
      hypothesis: "Vi tror att småbarnsföräldrar vill låna en båt, och vi vet det när fem familjer bokar.",
      mvpType: "EVENT",
      mvpDescription: "En träff i föreningslokalen.",
    });
  });
  it("drops a type it doesn't know, and a hypothesis missing a part", () => {
    const draft = coerceMvp({ mvp_type: "APP", hypothesis_who: "äldre", hypothesis_what: "promenera" }, words);
    expect(draft.mvpType).toBeNull();
    expect(draft.hypothesis).toBe("");
  });
});

describe("pilot plan (#320) — never overwrite", () => {
  const draft = coercePilotPlan({ pilot_where: "Hässelby", pilot_who: "10 äldre", pilot_duration: "8 veckor", pilot_team: "", success_criteria: ["Minst 6 par går varje vecka", "x", "y", "z"] });
  it("caps the success criteria at three", () => {
    expect(draft.successCriteria).toHaveLength(3);
  });
  it("fills only empty fields, and skips empty draft fields", () => {
    expect(emptyOnly(PILOT_PLAN_FIELDS, { pilotWhere: "Teamets egen plats", pilotWho: "  ", pilotDuration: null, pilotTeam: null, pilotBudget: null }, draft)).toEqual({ pilotWho: "10 äldre", pilotDuration: "8 veckor" });
    expect(emptyOnly(PILOT_PLAN_FIELDS, null, draft)).toEqual({ pilotWhere: "Hässelby", pilotWho: "10 äldre", pilotDuration: "8 veckor" });
  });
});
