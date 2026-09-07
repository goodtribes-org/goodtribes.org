import { isOverdue, getMilestoneTimelineStatus, getPhaseTimelineStatus } from "../lib/roadmap";

describe("roadmap", () => {
  describe("isOverdue", () => {
    it("is false when there is no date", () => {
      expect(isOverdue(null, "pending")).toBe(false);
    });

    it("is false once status is done, regardless of date", () => {
      const past = new Date(Date.now() - 86400000);
      expect(isOverdue(past, "done")).toBe(false);
    });

    it("is true for a past date that isn't done", () => {
      const past = new Date(Date.now() - 86400000);
      expect(isOverdue(past, "pending")).toBe(true);
    });

    it("is false for a future date", () => {
      const future = new Date(Date.now() + 86400000);
      expect(isOverdue(future, "pending")).toBe(false);
    });
  });

  describe("getMilestoneTimelineStatus", () => {
    it("returns done when status is done", () => {
      expect(getMilestoneTimelineStatus(new Date(Date.now() - 86400000), "done")).toBe("done");
    });

    it("returns overdue for a past due date not yet done", () => {
      expect(getMilestoneTimelineStatus(new Date(Date.now() - 86400000), "pending")).toBe("overdue");
    });

    it("returns upcoming for a future due date", () => {
      expect(getMilestoneTimelineStatus(new Date(Date.now() + 86400000), "pending")).toBe("upcoming");
    });

    it("returns upcoming when there is no due date", () => {
      expect(getMilestoneTimelineStatus(null, "pending")).toBe("upcoming");
    });
  });

  describe("getPhaseTimelineStatus", () => {
    it("is completed for a phase before the project's current phase", () => {
      expect(
        getPhaseTimelineStatus({ phaseValue: "IDEA", currentPhase: "PILOT", targetDate: null })
      ).toBe("completed");
    });

    it("is upcoming for a phase after the project's current phase", () => {
      expect(
        getPhaseTimelineStatus({ phaseValue: "SCALE", currentPhase: "PILOT", targetDate: null })
      ).toBe("upcoming");
    });

    it("is in_progress for the current phase with no target date", () => {
      expect(
        getPhaseTimelineStatus({ phaseValue: "PILOT", currentPhase: "PILOT", targetDate: null })
      ).toBe("in_progress");
    });

    it("is in_progress for the current phase with a future target date", () => {
      const future = new Date(Date.now() + 86400000);
      expect(
        getPhaseTimelineStatus({ phaseValue: "PILOT", currentPhase: "PILOT", targetDate: future })
      ).toBe("in_progress");
    });

    it("is at_risk for the current phase with a past target date", () => {
      const past = new Date(Date.now() - 86400000);
      expect(
        getPhaseTimelineStatus({ phaseValue: "PILOT", currentPhase: "PILOT", targetDate: past })
      ).toBe("at_risk");
    });

    it("treats SPRINT and IDEA as the same display phase (both project-current)", () => {
      expect(
        getPhaseTimelineStatus({ phaseValue: "SPRINT", currentPhase: "IDEA", targetDate: null })
      ).toBe("in_progress");
    });
  });
});
