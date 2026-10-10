jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiParticipant", () => ({ getAiParticipantUser: jest.fn() }));
jest.mock("../lib/projectVisibility", () => ({ PUBLIC_PROJECT_WHERE: {} }));

import { cohortFunnel, northStarByWeek, recentWeeks, weekStart } from "../lib/funnelMetrics";

const d = (s: string) => new Date(`${s}T12:00:00Z`);

describe("weekStart / recentWeeks", () => {
  it("starts weeks on Monday UTC", () => {
    expect(weekStart(d("2026-12-03")).toISOString()).toBe("2026-11-30T00:00:00.000Z"); // a Thursday
    expect(weekStart(d("2026-11-30")).toISOString()).toBe("2026-11-30T00:00:00.000Z");
    expect(weekStart(d("2026-12-06")).toISOString()).toBe("2026-11-30T00:00:00.000Z"); // Sunday
  });
  it("ends with the current week", () => {
    const weeks = recentWeeks(d("2026-12-03"), 3);
    expect(weeks.map((w) => w.toISOString().slice(0, 10))).toEqual(["2026-11-16", "2026-11-23", "2026-11-30"]);
  });
});

describe("cohortFunnel", () => {
  const weeks = recentWeeks(d("2026-10-07"), 2); // 2026-09-28, 2026-10-05
  const users = [
    { id: "a", createdAt: d("2026-09-29") },
    { id: "b", createdAt: d("2026-09-30") },
    { id: "c", createdAt: d("2026-10-06") },
  ];
  const steps = { dreamed: new Set(["a", "b", "c"]), openedTask: new Set(["a", "c"]), helped: new Set(["a"]) };

  it("counts each step per signup week", () => {
    const rows = cohortFunnel(users, steps, [], weeks, d("2026-10-07"));
    expect(rows.map((r) => [r.accounts, r.dreamed, r.openedTask, r.helped])).toEqual([[2, 2, 1, 1], [1, 1, 1, 0]]);
  });

  it("leaves 'active after 30 days' open until it can be known", () => {
    expect(cohortFunnel(users, steps, [], weeks, d("2026-10-07")).map((r) => r.active30)).toEqual([null, null]);
  });

  it("counts activity between day 30 and 60 after signup", () => {
    const activity = [
      { userId: "a", projectId: "p", at: d("2026-11-05") }, // day 37
      { userId: "b", projectId: "p", at: d("2026-10-10") }, // day 10: too early
    ];
    const rows = cohortFunnel(users, steps, activity, weeks, d("2026-12-31"));
    expect(rows[0].active30).toBe(1);
  });
});

describe("northStarByWeek", () => {
  const weeks = recentWeeks(d("2026-10-07"), 2);
  it("counts published projects with two or more people active that week", () => {
    const activity = [
      { userId: "a", projectId: "p1", at: d("2026-09-29") },
      { userId: "b", projectId: "p1", at: d("2026-10-01") },
      { userId: "a", projectId: "p2", at: d("2026-10-01") },
      { userId: "a", projectId: "p2", at: d("2026-10-02") }, // same person twice
      { userId: "a", projectId: "draft", at: d("2026-10-06") },
      { userId: "b", projectId: "draft", at: d("2026-10-06") },
      { userId: "a", projectId: "p1", at: d("2026-10-06") },
      { userId: "c", projectId: "p1", at: d("2026-10-07") },
    ];
    expect(northStarByWeek(activity, new Set(["p1", "p2"]), weeks)).toEqual([1, 1]);
  });
});
