let aiEnabled = true;
const isFeatureEnabled = jest.fn();

jest.mock("../lib/anthropic", () => ({ isAiEnabled: () => aiEnabled }));
jest.mock("../lib/featureFlags", () => ({ isFeatureEnabled: (...a: unknown[]) => isFeatureEnabled(...a) }));

import { isAiProjectStartAvailable } from "../lib/aiProjectStart";

describe("isAiProjectStartAvailable — flag AND key", () => {
  beforeEach(() => isFeatureEnabled.mockReset());

  it("needs both the flag and a configured Anthropic key", async () => {
    aiEnabled = true;
    isFeatureEnabled.mockResolvedValue(true);
    await expect(isAiProjectStartAvailable("u1")).resolves.toBe(true);
    isFeatureEnabled.mockResolvedValue(false);
    await expect(isAiProjectStartAvailable("u1")).resolves.toBe(false);
  });

  it("without a key it's off even with the flag on — and doesn't bother reading the flag", async () => {
    aiEnabled = false;
    isFeatureEnabled.mockResolvedValue(true);
    await expect(isAiProjectStartAvailable("u1")).resolves.toBe(false);
    expect(isFeatureEnabled).not.toHaveBeenCalled();
  });
});
