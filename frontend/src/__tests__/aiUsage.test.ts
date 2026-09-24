jest.mock("../lib/logger", () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));

import type AnthropicSdk from "@anthropic-ai/sdk";
import { logger } from "../lib/logger";
import { estimateCostUsd, withUsageLogging } from "../lib/aiUsage";

describe("estimateCostUsd", () => {
  it("prices input, output, cache and web searches for a known model", () => {
    // 1M in = $3, 100k out = $1.5, 3 searches = $0.03
    expect(estimateCostUsd("claude-sonnet-4-6", { input_tokens: 1_000_000, output_tokens: 100_000, server_tool_use: { web_search_requests: 3 } })).toBe(4.53);
    // cache reads at 0.1x input
    expect(estimateCostUsd("claude-sonnet-4-6", { cache_read_input_tokens: 1_000_000 })).toBe(0.3);
  });

  it("is null for a model without a price", () => {
    expect(estimateCostUsd("some-other-model", { input_tokens: 10 })).toBeNull();
  });
});

describe("withUsageLogging", () => {
  it("logs one line per call and returns the response unchanged", async () => {
    const response = { content: [], usage: { input_tokens: 4000, output_tokens: 1000 } };
    const create = jest.fn().mockResolvedValue(response);
    const client = { messages: { create }, other: 1 } as unknown as AnthropicSdk;
    const wrapped = withUsageLogging(client, { feature: "impact-model", projectId: "p1" });
    const out = await wrapped.messages.create({ model: "claude-sonnet-4-6", max_tokens: 10, messages: [] });
    expect(out).toBe(response);
    expect((wrapped as unknown as { other: number }).other).toBe(1);
    expect(logger.info).toHaveBeenCalledWith(
      "ai usage",
      expect.objectContaining({ feature: "impact-model", projectId: "p1", inputTokens: 4000, outputTokens: 1000, estimatedUsd: 0.027 }),
    );
  });
});
