jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/authz", () => ({ isSiteAdmin: jest.fn() }));
jest.mock("../lib/org-authz", () => ({ hasOrgRole: jest.fn(), ORG_LEAD_ROLES: ["OWNER", "ADMIN"] }));

import { isSiteAdmin } from "../lib/authz";
import { hasOrgRole } from "../lib/org-authz";
import { canManageChallenges, challengeStage, daysLeft, isOpenForIdeas } from "../lib/challenges";

const NOW = new Date("2026-10-07T12:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;
const at = (offsetDays: number) => new Date(NOW + offsetDays * DAY);

describe("challenges (#228)", () => {
  it("a draft is a draft whatever its dates", () => {
    expect(challengeStage({ publishedAt: null, closesAt: at(5) }, 0, NOW)).toBe("draft");
    expect(isOpenForIdeas({ publishedAt: null, closesAt: at(5) }, NOW)).toBe(false);
  });

  it("is open for ideas until the deadline", () => {
    expect(challengeStage({ publishedAt: at(-1), closesAt: at(5) }, 0, NOW)).toBe("open");
    expect(isOpenForIdeas({ publishedAt: at(-1), closesAt: at(5) }, NOW)).toBe(true);
    expect(isOpenForIdeas({ publishedAt: at(-10), closesAt: at(-1) }, NOW)).toBe(false);
  });

  it("after the deadline it's selecting until the organisation features an idea, then closed", () => {
    expect(challengeStage({ publishedAt: at(-10), closesAt: at(-1) }, 0, NOW)).toBe("selecting");
    expect(challengeStage({ publishedAt: at(-10), closesAt: at(-1) }, 2, NOW)).toBe("closed");
  });

  it("counts days left rounded up, never below zero", () => {
    expect(daysLeft(at(0.2), NOW)).toBe(1);
    expect(daysLeft(at(3), NOW)).toBe(3);
    expect(daysLeft(at(-2), NOW)).toBe(0);
  });

  it("only leads of a verified organisation (or site admins) run challenges", async () => {
    (isSiteAdmin as jest.Mock).mockResolvedValue(false);
    (hasOrgRole as jest.Mock).mockResolvedValue(true);
    expect(await canManageChallenges({ id: "o", verified: true }, "u")).toBe(true);
    expect(await canManageChallenges({ id: "o", verified: false }, "u")).toBe(false);
    expect(await canManageChallenges({ id: "o", verified: true }, null)).toBe(false);
    (hasOrgRole as jest.Mock).mockResolvedValue(false);
    expect(await canManageChallenges({ id: "o", verified: true }, "u")).toBe(false);
    (isSiteAdmin as jest.Mock).mockResolvedValue(true);
    expect(await canManageChallenges({ id: "o", verified: false }, "u")).toBe(true);
  });
});
