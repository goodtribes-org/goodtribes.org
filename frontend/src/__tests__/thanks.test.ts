const auth = jest.fn();
const projectFindFirst = jest.fn();
const kudosCreate = jest.fn();
const kudosCount = jest.fn();
const createNotification = jest.fn();
const guardSocialAction = jest.fn();

jest.mock("../auth", () => ({ auth: () => auth() }));
jest.mock("../lib/prisma", () => ({
  prisma: {
    project: { findFirst: (a: unknown) => projectFindFirst(a) },
    kudos: { create: (a: unknown) => kudosCreate(a), count: (a: unknown) => kudosCount(a) },
  },
}));
jest.mock("../lib/notify", () => ({ createNotification: (a: unknown) => createNotification(a) }));
jest.mock("../lib/socialActionGuard", () => ({ guardSocialAction: (...a: unknown[]) => guardSocialAction(...a) }));
jest.mock("../i18n/routing", () => ({ routing: { defaultLocale: "sv" } }));
jest.mock("next-intl/server", () => ({
  // Echo the key and values, so the test can see which sentence was picked.
  getTranslations: async () => (key: string, values?: Record<string, string>) => `${key}${values ? JSON.stringify(values) : ""}`,
}));

import { thankContribution } from "../app/thanks-actions";

const PROJECT = { id: "p1", ownerId: "owner", slug: "skolmatappen", title: "Skolmatappen" };

beforeEach(() => {
  jest.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "anna", name: "Anna" } });
  projectFindFirst.mockResolvedValue(PROJECT);
  guardSocialAction.mockResolvedValue({ ok: true });
  kudosCreate.mockResolvedValue({ id: "k1" });
  kudosCount.mockResolvedValue(1);
});

describe("thankContribution", () => {
  it("needs a logged-in member", async () => {
    auth.mockResolvedValue(null);
    await expect(thankContribution("project", "p1")).resolves.toMatchObject({ ok: false, code: "NOT_LOGGED_IN" });
    expect(kudosCreate).not.toHaveBeenCalled();
  });

  it("refuses item types that can't be thanked for", async () => {
    await expect(thankContribution("channelMessage", "m1")).resolves.toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(kudosCreate).not.toHaveBeenCalled();
  });

  it("refuses thanking yourself", async () => {
    auth.mockResolvedValue({ user: { id: "owner", name: "Owner" } });
    await expect(thankContribution("project", "p1")).resolves.toMatchObject({ ok: false, code: "OWN" });
    expect(kudosCreate).not.toHaveBeenCalled();
  });

  it("stops when the social-action guard says no", async () => {
    guardSocialAction.mockResolvedValue({ ok: false, error: "för snabbt", code: "RATE_LIMITED" });
    await expect(thankContribution("project", "p1")).resolves.toMatchObject({ ok: false, code: "RATE_LIMITED" });
    expect(kudosCreate).not.toHaveBeenCalled();
  });

  it("creates a kudos for the item's own author (not a client-chosen one) and notifies them", async () => {
    await expect(thankContribution("project", "p1")).resolves.toEqual({ ok: true, count: 1 });

    expect(kudosCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromUserId: "anna", toUserId: "owner", projectId: "p1", targetType: "project", targetId: "p1",
        message: expect.stringContaining("kudosMessage.startedProject"),
      }),
    });
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "owner", type: "thanks_received", url: "/projects/skolmatappen" }),
    );
  });

  it("a second thanks for the same item (unique key) sends no second notification", async () => {
    kudosCreate.mockRejectedValue(new Error("Unique constraint failed"));
    await expect(thankContribution("project", "p1")).resolves.toEqual({ ok: true, count: 1 });
    expect(createNotification).not.toHaveBeenCalled();
  });
});
