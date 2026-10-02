jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));
jest.mock("../lib/aiParticipant", () => ({ getAiParticipantUser: jest.fn() }));

import { cardPhaseAfterGate, cardPhaseFor, isStepOf, validCardStep } from "@/lib/phaseWork";
import { coerceTasks } from "@/lib/uppstartFill";
import { tasksToolFor } from "@/lib/prompts/uppstartFill";

describe("phaseWork", () => {
  it("merges SPRINT into IDEA", () => {
    expect(cardPhaseFor("SPRINT")).toBe("IDEA");
    expect(cardPhaseFor("PILOT")).toBe("PILOT");
  });

  it("puts gate cards in the next phase on CONTINUE, else the same one", () => {
    expect(cardPhaseAfterGate("IDEA", "CONTINUE")).toBe("PILOT");
    expect(cardPhaseAfterGate("SPRINT", "CONTINUE")).toBe("PILOT");
    expect(cardPhaseAfterGate("PILOT", "ADJUST")).toBe("PILOT");
    expect(cardPhaseAfterGate("PRODUCTION", "PIVOT")).toBe("PRODUCTION");
    expect(cardPhaseAfterGate("ESTABLISH", "CONTINUE")).toBe("SCALE");
    expect(cardPhaseAfterGate("IMPACT", "CONTINUE")).toBe("IMPACT");
  });

  it("only accepts steps of the phase", () => {
    expect(isStepOf("PILOT", "core_team_formed")).toBe(true);
    expect(isStepOf("IDEA", "core_team_formed")).toBe(false);
    expect(isStepOf("PILOT", null)).toBe(false);
  });

  it("validates a picked phase/step", () => {
    expect(validCardStep({ phase: "PILOT", stepKey: "core_team_formed" })).toEqual({ phase: "PILOT", stepKey: "core_team_formed" });
    expect(validCardStep({ phase: "PILOT", stepKey: "lean_canvas_created" })).toEqual({ phase: "PILOT", stepKey: null });
    expect(validCardStep({ phase: "SPRINT", stepKey: null })).toEqual({ phase: null, stepKey: null });
    expect(validCardStep({ phase: "BOGUS", stepKey: "x" })).toEqual({ phase: null, stepKey: null });
    expect(validCardStep(null)).toEqual({ phase: null, stepKey: null });
  });
});

describe("AI tasks with steps", () => {
  it("keeps a step only when it is one of the phase's", () => {
    const tasks = coerceTasks(
      { tasks: [{ title: "" }, { title: "Bilda kärnteam", step: "core_team_formed" }, { title: "Annat", step: "nope" }] },
      ["core_team_formed"],
    );
    expect(tasks).toEqual([
      { title: "Bilda kärnteam", description: "", stepKey: "core_team_formed" },
      { title: "Annat", description: "", stepKey: null },
    ]);
  });

  it("offers the phase's steps as an enum", () => {
    const tool = tasksToolFor([{ key: "a", label: "A" }, { key: "b", label: "B" }]);
    const step = tool.input_schema.properties.tasks.items.properties.step;
    expect(step.enum).toEqual(["a", "b"]);
    expect(tool.input_schema.properties.tasks.items.required).toEqual(["title", "description"]);
  });
});
