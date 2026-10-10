import { earlierPhases, isMoveBack, phaseIndex } from "../lib/projectPhase";

describe("restart from an earlier phase (#313)", () => {
  it("orders the visible phases, with SPRINT as Idé", () => {
    expect(phaseIndex("IDEA")).toBe(0);
    expect(phaseIndex("SPRINT")).toBe(0);
    expect(phaseIndex("ESTABLISH")).toBe(3);
  });
  it("offers only the phases before the current one", () => {
    expect(earlierPhases("ESTABLISH")).toEqual(["IDEA", "PILOT", "PRODUCTION"]);
    expect(earlierPhases("IDEA")).toEqual([]);
    expect(earlierPhases("SPRINT")).toEqual([]);
  });
  it("knows a move back from a move forward or sideways", () => {
    expect(isMoveBack("ESTABLISH", "IDEA")).toBe(true);
    expect(isMoveBack("IDEA", "PILOT")).toBe(false);
    expect(isMoveBack("SPRINT", "IDEA")).toBe(false);
    expect(isMoveBack(null, "IDEA")).toBe(false);
  });
});
