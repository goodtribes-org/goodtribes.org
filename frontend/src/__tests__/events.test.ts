jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("../lib/prisma", () => ({ prisma: {} }));

import { normalizeEventCode } from "../lib/events";

describe("normalizeEventCode", () => {
  it("keeps the code to lower-case letters, digits and dashes", () => {
    expect(normalizeEventCode("  Dec3 ")).toBe("dec3");
    expect(normalizeEventCode("GT-Kväll 2026!")).toBe("gt-kvll2026");
    expect(normalizeEventCode("a".repeat(60))).toHaveLength(40);
  });
});
