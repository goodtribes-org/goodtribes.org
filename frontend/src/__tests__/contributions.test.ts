jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/projectVisibility", () => ({ PUBLIC_PROJECT_WHERE: {} }));

import { groupContributions } from "../lib/contributions";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const proj = (slug: string) => ({ slug, title: slug.toUpperCase(), phase: "IDEA" as const });

describe("groupContributions", () => {
  it("lists memberships with their finished tasks, most work first", () => {
    const out = groupContributions(
      [
        { role: "FOUNDER", joinedAt: d("2026-09-01"), project: proj("a") },
        { role: "MEMBER", joinedAt: d("2026-09-10"), project: proj("b") },
      ],
      [
        { title: "Kort 1", projectSlug: "b", updatedAt: d("2026-09-20"), project: { title: "B", phase: "IDEA" } },
        { title: "Kort 2", projectSlug: "b", updatedAt: d("2026-09-25"), project: { title: "B", phase: "IDEA" } },
      ],
      [{ projectSlug: "a", completedAt: d("2026-09-15") }],
      new Map([["a", 2]]),
    );
    expect(out.map((p) => [p.slug, p.role, p.tasksDone, p.subtasksDone, p.verifiedImpact])).toEqual([
      ["b", "MEMBER", 2, 0, 0],
      ["a", "FOUNDER", 0, 1, 2],
    ]);
    expect(out[0].recentTasks).toEqual(["Kort 2", "Kort 1"]);
  });

  it("includes projects helped from outside, dated from the first task", () => {
    const out = groupContributions(
      [],
      [
        { title: "Sen", projectSlug: "c", updatedAt: d("2026-10-05"), project: { title: "C", phase: "PILOT" } },
        { title: "Tidig", projectSlug: "c", updatedAt: d("2026-10-01"), project: { title: "C", phase: "PILOT" } },
      ],
      [],
      new Map(),
    );
    expect(out).toHaveLength(1);
    expect(out[0].role).toBeNull();
    expect(out[0].since).toEqual(d("2026-10-01"));
  });

  it("leaves out a follower who did nothing, and lone subtasks outside one's projects", () => {
    const out = groupContributions(
      [{ role: "FOLLOWER", joinedAt: d("2026-09-01"), project: proj("f") }],
      [],
      [{ projectSlug: "x", completedAt: d("2026-09-02") }],
      new Map(),
    );
    expect(out).toEqual([]);
  });
});
