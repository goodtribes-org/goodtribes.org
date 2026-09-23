const findMany = jest.fn();
const isSiteAdmin = jest.fn();

jest.mock("next/cache", () => ({
  // Pass-through: these tests exercise flag evaluation, not Next's cache.
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: jest.fn(),
}));
jest.mock("../lib/prisma", () => ({ prisma: { featureFlag: { findMany: (...a: unknown[]) => findMany(...a) } } }));
jest.mock("../lib/authz", () => ({ isSiteAdmin: (...a: unknown[]) => isSiteAdmin(...a) }));

import { evaluateFeatureFlag, isFeatureEnabled, isKnownFeatureFlag } from "../lib/featureFlags";

describe("evaluateFeatureFlag", () => {
  it("OFF is off for everyone", () => {
    expect(evaluateFeatureFlag("OFF", false)).toBe(false);
    expect(evaluateFeatureFlag("OFF", true)).toBe(false);
  });
  it("ADMINS_ONLY is on only for site admins", () => {
    expect(evaluateFeatureFlag("ADMINS_ONLY", false)).toBe(false);
    expect(evaluateFeatureFlag("ADMINS_ONLY", true)).toBe(true);
  });
  it("ON is on for everyone", () => {
    expect(evaluateFeatureFlag("ON", false)).toBe(true);
    expect(evaluateFeatureFlag("ON", true)).toBe(true);
  });
});

describe("isFeatureEnabled", () => {
  beforeEach(() => {
    findMany.mockReset();
    isSiteAdmin.mockReset();
  });

  it("treats a flag with no row as OFF", async () => {
    findMany.mockResolvedValue([]);
    await expect(isFeatureEnabled("ai-project-start", "u1")).resolves.toBe(false);
    expect(isSiteAdmin).not.toHaveBeenCalled();
  });

  it("only looks up the user's role for ADMINS_ONLY flags", async () => {
    findMany.mockResolvedValue([{ key: "ai-project-start", state: "ON" }]);
    await expect(isFeatureEnabled("ai-project-start", "u1")).resolves.toBe(true);
    expect(isSiteAdmin).not.toHaveBeenCalled();
  });

  it("ADMINS_ONLY: on for a site admin, off for others and for logged-out visitors", async () => {
    findMany.mockResolvedValue([{ key: "ai-project-start", state: "ADMINS_ONLY" }]);
    isSiteAdmin.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(isFeatureEnabled("ai-project-start", "admin")).resolves.toBe(true);
    await expect(isFeatureEnabled("ai-project-start", "user")).resolves.toBe(false);
    await expect(isFeatureEnabled("ai-project-start", null)).resolves.toBe(false);
    expect(isSiteAdmin).toHaveBeenCalledTimes(2);
  });

  it("isKnownFeatureFlag rejects unknown keys", () => {
    expect(isKnownFeatureFlag("ai-project-start")).toBe(true);
    expect(isKnownFeatureFlag("nope")).toBe(false);
    expect(isKnownFeatureFlag("toString")).toBe(false);
  });
});
