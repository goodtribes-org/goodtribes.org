const memberFindMany = jest.fn();
const cardFindMany = jest.fn();
const notificationCount = jest.fn();
const kudosFindMany = jest.fn();
const kudosCount = jest.fn();
const activityGroupBy = jest.fn();
const joinFindMany = jest.fn();

jest.mock("../lib/prisma", () => ({
  prisma: {
    projectMember: { findMany: (a: unknown) => memberFindMany(a) },
    kanbanCard: { findMany: (a: unknown) => cardFindMany(a) },
    notification: { count: (a: unknown) => notificationCount(a) },
    kudos: { findMany: (a: unknown) => kudosFindMany(a), count: (a: unknown) => kudosCount(a) },
    activityEvent: { groupBy: (a: unknown) => activityGroupBy(a) },
    projectJoinRequest: { findMany: (a: unknown) => joinFindMany(a) },
  },
}));

import { getYourTribe } from "../lib/yourTribe";

const project = (id: string) => ({ id, slug: id, title: id, phase: "IDEA", imageUrl: null, updatedAt: new Date() });

beforeEach(() => {
  jest.clearAllMocks();
  memberFindMany.mockResolvedValue([
    { role: "FOUNDER", project: project("led") },
    { role: "MEMBER", project: project("joined") },
  ]);
  cardFindMany.mockResolvedValue([]);
  notificationCount.mockResolvedValue(0);
  kudosFindMany.mockResolvedValue([]);
  kudosCount.mockResolvedValue(0);
  activityGroupBy.mockResolvedValue([{ projectId: "joined", _count: 4 }]);
  joinFindMany.mockResolvedValue([]);
});

describe("getYourTribe", () => {
  it("leaves followers out of 'your projects'", async () => {
    await getYourTribe("me");
    expect(memberFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "me", role: { not: "FOLLOWER" } }) }));
  });

  it("counts only what the others did lately, not your own events", async () => {
    const data = await getYourTribe("me");
    const where = activityGroupBy.mock.calls[0][0].where;
    expect(where.userId).toEqual({ not: "me" });
    expect(where.projectId).toEqual({ in: ["led", "joined"] });
    expect(data.projects.find((p) => p.id === "joined")?.recentByOthers).toBe(4);
    expect(data.projects.find((p) => p.id === "led")?.recentByOthers).toBe(0);
  });

  it("asks for join requests only for projects you lead", async () => {
    const data = await getYourTribe("me");
    expect(joinFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId: { in: ["led"] }, status: "pending" } }));
    expect(data.projects.find((p) => p.id === "led")?.isLead).toBe(true);
    expect(data.projects.find((p) => p.id === "joined")?.isLead).toBe(false);
  });

  it("lists only open tasks assigned to you", async () => {
    await getYourTribe("me");
    expect(cardFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ assigneeId: "me", column: { not: "DONE" } }) }));
  });

  it("skips the follow-up queries when you're in no project", async () => {
    memberFindMany.mockResolvedValue([]);
    const data = await getYourTribe("me");
    expect(activityGroupBy).not.toHaveBeenCalled();
    expect(joinFindMany).not.toHaveBeenCalled();
    expect(data.projects).toEqual([]);
  });
});
