const findFirst = jest.fn();
const create = jest.fn();

jest.mock("../lib/prisma", () => ({
  prisma: { activityEvent: { findFirst: (a: unknown) => findFirst(a), create: (a: unknown) => create(a) } },
}));

import { logToolWork, THROTTLE_MINUTES, TOOL_EDITED } from "../lib/toolWork";

beforeEach(() => {
  jest.clearAllMocks();
  findFirst.mockResolvedValue(null);
  create.mockResolvedValue({ id: "e1" });
});

describe("logToolWork", () => {
  it("logs a tool_edited event with the tool in the payload", async () => {
    await logToolWork("p1", "u1", "leanCanvas");
    expect(create).toHaveBeenCalledWith({ data: { projectId: "p1", userId: "u1", type: TOOL_EDITED, payload: { tool: "leanCanvas" } } });
  });

  it("looks for the same person, project and tool within the throttle window", async () => {
    const before = Date.now();
    await logToolWork("p1", "u1", "wiki");
    const where = findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ projectId: "p1", userId: "u1", type: TOOL_EDITED, payload: { path: ["tool"], equals: "wiki" } });
    const windowMs = before - where.createdAt.gte.getTime();
    expect(windowMs).toBeGreaterThanOrEqual(THROTTLE_MINUTES * 60 * 1000 - 5);
    expect(windowMs).toBeLessThan(THROTTLE_MINUTES * 60 * 1000 + 1000);
  });

  it("logs nothing when there's already one in the window", async () => {
    findFirst.mockResolvedValue({ id: "recent" });
    await logToolWork("p1", "u1", "wiki");
    expect(create).not.toHaveBeenCalled();
  });

  it("never throws — a failing write must not break the save it rides on", async () => {
    create.mockRejectedValue(new Error("db down"));
    await expect(logToolWork("p1", "u1", "polls")).resolves.toBeUndefined();
  });
});
