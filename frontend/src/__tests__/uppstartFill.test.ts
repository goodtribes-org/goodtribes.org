jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));
jest.mock("../lib/aiParticipant", () => ({ getAiParticipantUser: jest.fn() }));

import {
  coercePlan,
  coerceRoles,
  coerceSprintPlan,
  coerceTasks,
  isUppstartFillInProgress,
  parseUppstartStatus,
  planFieldsToWrite,
  sprintPlanHtml,
} from "../lib/uppstartFill";

describe("parseUppstartStatus", () => {
  it("keeps only known sections and states", () => {
    expect(parseUppstartStatus({ team: "done", sprint: "running", bogus: "done", plan: "weird" })).toEqual({ team: "done", sprint: "running" });
  });

  it("shows a section still waiting after 5 minutes as failed", () => {
    const updated = new Date("2026-09-24T10:00:00Z");
    const later = updated.getTime() + 6 * 60_000;
    expect(parseUppstartStatus({ team: "running", tasks: "done" }, updated, later)).toEqual({ team: "failed", tasks: "done" });
    expect(isUppstartFillInProgress(parseUppstartStatus({ team: "running" }, updated, later))).toBe(false);
    expect(isUppstartFillInProgress({ plan: "pending" })).toBe(true);
  });
});

describe("roles and tasks", () => {
  it("drops untitled entries and caps the count", () => {
    const roles = coerceRoles({ roles: [{ title: " Projektledare ", description: "Håller ihop" }, { title: "" }, ...Array(6).fill({ title: "X" })] });
    expect(roles[0]).toEqual({ title: "Projektledare", description: "Håller ihop" });
    expect(roles).toHaveLength(5);
    expect(coerceTasks(null)).toEqual([]);
    expect(coerceTasks({ tasks: Array(10).fill({ title: "Boka sprinttid" }) })).toHaveLength(7);
  });
});

describe("sprint plan", () => {
  it("needs sprint questions, and falls back to a default name", () => {
    expect(coerceSprintPlan({ sprint_name: "S", sprint_questions: [] })).toBeNull();
    const p = coerceSprintPlan({ sprint_questions: ["Hämtar familjerna maten?"], hmw: ["HSVK göra det anonymt?"] });
    expect(p?.sprintName).toBe("Design Sprint 1");
    expect(p?.hmw).toEqual(["HSVK göra det anonymt?"]);
  });

  it("escapes model output in the wiki page", () => {
    const p = coerceSprintPlan({ sprint_questions: ["<script>x</script>"], long_term_goal: "a & b" })!;
    const html = sprintPlanHtml(p);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a &amp; b");
  });
});

describe("planFieldsToWrite — never overwrite", () => {
  const draft = coercePlan({ goal: "Pilot i två skolor", milestones: "M1", resources: "Tid", risks: "" });
  it("fills only empty fields, and skips empty draft fields", () => {
    expect(planFieldsToWrite({ goal: "Teamets eget mål", milestones: "  ", resources: null, risks: null }, draft)).toEqual({ milestones: "M1", resources: "Tid" });
    expect(planFieldsToWrite(null, draft)).toEqual({ goal: "Pilot i två skolor", milestones: "M1", resources: "Tid" });
  });
});
