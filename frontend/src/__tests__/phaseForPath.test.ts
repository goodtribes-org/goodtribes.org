import { activePhaseFor, phaseForProjectPath } from "../lib/phaseForPath";

describe("phaseForProjectPath", () => {
  it("maps phase tools, overviews and guides to their phase", () => {
    expect(phaseForProjectPath("/projects/x/sprints", "x")).toBe("PILOT");
    expect(phaseForProjectPath("/projects/x/sprints/abc", "x")).toBe("PILOT");
    expect(phaseForProjectPath("/projects/x/lean-canvas", "x")).toBe("IDEA");
    expect(phaseForProjectPath("/projects/x/lansering", "x")).toBe("PRODUCTION");
    expect(phaseForProjectPath("/projects/x/impact-followup", "x")).toBe("IMPACT");
    expect(phaseForProjectPath("/projects/x/guide", "x")).toBe("IDEA");
    expect(phaseForProjectPath("/projects/x/guide/scale", "x")).toBe("SCALE");
  });

  it("general tools and the project home belong to no phase", () => {
    for (const p of ["/projects/x", "/projects/x/tasks", "/projects/x/wiki", "/projects/x/members", "/projects/x/kanban", "/projects/x/funding"]) {
      expect(phaseForProjectPath(p, "x")).toBeNull();
    }
    expect(phaseForProjectPath("/projects/other/sprints", "x")).toBeNull();
  });

  it("falls back to the project's own phase (SPRINT shown as Idé)", () => {
    expect(activePhaseFor("/projects/x/tasks", "x", "PRODUCTION")).toBe("PRODUCTION");
    expect(activePhaseFor("/projects/x/tasks", "x", "SPRINT")).toBe("IDEA");
    expect(activePhaseFor("/projects/x/sprints", "x", "IDEA")).toBe("PILOT");
  });
});
