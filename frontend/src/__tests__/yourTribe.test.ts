const memberFindMany = jest.fn();
const cardFindMany = jest.fn();
const joinFindMany = jest.fn();
const notificationCount = jest.fn();
const kudosCount = jest.fn();
const activityFindMany = jest.fn();
const activityFindFirst = jest.fn();
const messageFindMany = jest.fn();
const messageFindFirst = jest.fn();
const blogFindMany = jest.fn();
const blogFindFirst = jest.fn();
const checklistFindMany = jest.fn();
const getAutoDoneKeys = jest.fn();

jest.mock("../lib/prisma", () => ({
  prisma: {
    projectMember: { findMany: (a: unknown) => memberFindMany(a) },
    kanbanCard: { findMany: (a: unknown) => cardFindMany(a) },
    projectJoinRequest: { findMany: (a: unknown) => joinFindMany(a) },
    notification: { count: (a: unknown) => notificationCount(a) },
    kudos: { count: (a: unknown) => kudosCount(a) },
    activityEvent: { findMany: (a: unknown) => activityFindMany(a), findFirst: (a: unknown) => activityFindFirst(a) },
    message: { findMany: (a: unknown) => messageFindMany(a), findFirst: (a: unknown) => messageFindFirst(a) },
    blogPost: { findMany: (a: unknown) => blogFindMany(a), findFirst: (a: unknown) => blogFindFirst(a) },
    initiativeChecklistItem: { findMany: (a: unknown) => checklistFindMany(a) },
  },
}));
jest.mock("../lib/projectSignals", () => ({ getAutoDoneKeys: (...a: unknown[]) => getAutoDoneKeys(...a) }));
// lib/authz pulls in @/auth (and its connections) — only the role list is needed here.
jest.mock("../lib/authz", () => ({ PROJECT_LEAD_ROLES: ["FOUNDER", "ADMIN"] }));

import { getYourTribe, pulseStatus, weeklyCounts } from "../lib/yourTribe";

const DAY = 86_400_000;
const NOW = new Date("2026-10-01T12:00:00Z").getTime();
const daysAgo = (n: number) => new Date(NOW - n * DAY);
const project = (id: string, draftSinceDays?: number) => ({
  id, slug: id, title: id, phase: "IDEA", imageUrl: null,
  publishedAt: draftSinceDays === undefined ? daysAgo(60) : null,
  createdAt: daysAgo(draftSinceDays ?? 60),
});

beforeEach(() => {
  jest.clearAllMocks();
  memberFindMany.mockResolvedValue([
    { role: "FOUNDER", project: project("quiet") },
    { role: "MEMBER", project: project("busy") },
  ]);
  cardFindMany.mockResolvedValue([]);
  joinFindMany.mockResolvedValue([]);
  notificationCount.mockResolvedValue(0);
  kudosCount.mockResolvedValue(0);
  activityFindMany.mockResolvedValue([
    { projectId: "busy", createdAt: daysAgo(1) },
    { projectId: "busy", createdAt: daysAgo(2) },
    { projectId: "busy", createdAt: daysAgo(9) },
  ]);
  messageFindMany.mockResolvedValue([]);
  blogFindMany.mockResolvedValue([]);
  activityFindFirst.mockImplementation(({ where }: { where: { projectId: string } }) =>
    Promise.resolve(where.projectId === "busy" ? { type: "task_completed", payload: { title: "X" }, createdAt: daysAgo(1), user: { name: "Anna" } } : null),
  );
  messageFindFirst.mockResolvedValue(null);
  blogFindFirst.mockResolvedValue(null);
  checklistFindMany.mockResolvedValue([]);
  getAutoDoneKeys.mockResolvedValue([]);
});

describe("pulse helpers", () => {
  it("status follows the last activity: ≤7 days moving, ≤14 slowing, else still", () => {
    expect(pulseStatus(daysAgo(3), NOW)).toBe("moving");
    expect(pulseStatus(daysAgo(10), NOW)).toBe("slowing");
    expect(pulseStatus(daysAgo(30), NOW)).toBe("still");
    expect(pulseStatus(null, NOW)).toBe("still");
  });

  it("buckets dates per week, oldest first, the last week ending now", () => {
    expect(weeklyCounts([daysAgo(1), daysAgo(2), daysAgo(9), daysAgo(40)], NOW)).toEqual([0, 0, 1, 2]);
  });
});

describe("getYourTribe", () => {
  it("puts the most active project first and gives each its weekly bars and status", async () => {
    const data = await getYourTribe("me", NOW);
    expect(data.pulse.map((p) => p.id)).toEqual(["busy", "quiet"]);
    expect(data.pulse[0]).toMatchObject({ status: "moving", total: 3, weeks: [0, 0, 1, 2] });
    expect(data.pulse[0].last).toMatchObject({ type: "activity", who: "Anna", activityType: "task_completed" });
    expect(data.pulse[1]).toMatchObject({ status: "still", total: 0, last: null });
  });

  it("leaves followers out", async () => {
    await getYourTribe("me", NOW);
    expect(memberFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ role: { not: "FOLLOWER" } }) }));
  });

  it("ranks to-dos: overdue, due soon, join requests, next steps, other tasks", async () => {
    cardFindMany.mockResolvedValue([
      { id: "later", title: "Later", dueDate: null, project: { slug: "busy", title: "busy" } },
      { id: "soon", title: "Soon", dueDate: new Date(NOW + 2 * DAY), project: { slug: "busy", title: "busy" } },
      { id: "late", title: "Late", dueDate: daysAgo(1), project: { slug: "busy", title: "busy" } },
    ]);
    joinFindMany.mockResolvedValue([{ id: "jr", user: { name: "Bo" }, project: { slug: "quiet", title: "quiet" } }]);
    const data = await getYourTribe("me", NOW);
    expect(data.todos.map((t) => `${t.kind}:${t.id}`)).toEqual(["task:late", "task:soon", "joinRequest:jr", "nextStep:step-quiet", "task:later"]);
    expect(data.todos[0]).toMatchObject({ overdue: true });
    expect(data.todos[3]).toMatchObject({ project: "quiet", projectStill: true });
  });

  it("nudges a lead to publish a draft that has waited a week, not a fresh one or someone else's (#226)", async () => {
    memberFindMany.mockResolvedValue([
      { role: "FOUNDER", project: project("old-draft", 9) },
      { role: "FOUNDER", project: project("new-draft", 2) },
      { role: "MEMBER", project: project("their-draft", 30) },
    ]);
    const data = await getYourTribe("me", NOW);
    const drafts = data.todos.filter((t) => t.kind === "draft");
    expect(drafts).toEqual([{ kind: "draft", id: "draft-old-draft", project: "old-draft", href: "/projects/old-draft", days: 9 }]);
  });

  it("asks for join requests and next steps only for projects you lead", async () => {
    const data = await getYourTribe("me", NOW);
    expect(joinFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId: { in: ["quiet"] }, status: "pending" } }));
    expect(getAutoDoneKeys).toHaveBeenCalledTimes(1);
    expect(getAutoDoneKeys).toHaveBeenCalledWith("quiet", "quiet");
    expect(data.todos.filter((t) => t.kind === "nextStep")).toHaveLength(1);
  });

  it("without lastEvents, skips the per-project lookups but keeps status, order and to-dos", async () => {
    const full = await getYourTribe("me", NOW);
    jest.clearAllMocks();
    const light = await getYourTribe("me", NOW, { lastEvents: false });
    expect(activityFindFirst).not.toHaveBeenCalled();
    expect(messageFindFirst).not.toHaveBeenCalled();
    expect(blogFindFirst).not.toHaveBeenCalled();
    expect(light.pulse.map((p) => [p.id, p.status, p.last])).toEqual([["busy", "moving", null], ["quiet", "still", null]]);
    expect(light.pulse.map((p) => p.id)).toEqual(full.pulse.map((p) => p.id));
    expect(light.todoTotal).toBe(full.todoTotal);
  });

  it("reads 'slowing' from the weekly window alone, too", async () => {
    activityFindMany.mockResolvedValue([{ projectId: "busy", createdAt: daysAgo(10) }]);
    const light = await getYourTribe("me", NOW, { lastEvents: false });
    expect(light.pulse.find((p) => p.id === "busy")?.status).toBe("slowing");
  });

  it("skips the follow-up queries when you're in no project", async () => {
    memberFindMany.mockResolvedValue([]);
    const data = await getYourTribe("me", NOW);
    expect(activityFindMany).not.toHaveBeenCalled();
    expect(joinFindMany).not.toHaveBeenCalled();
    expect(data.pulse).toEqual([]);
  });
});
