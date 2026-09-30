import { costMicroUsd, modelPrice } from "../lib/aiCost";

const usage = (u: Record<string, unknown>) => ({ input_tokens: 0, output_tokens: 0, ...u }) as never;

describe("aiCost", () => {
  it("prices each model family, most specific ID first", () => {
    expect(modelPrice("claude-haiku-4-5-20251001")).toEqual({ input: 1, output: 5 });
    expect(modelPrice("claude-sonnet-4-6")).toEqual({ input: 3, output: 15 });
    expect(modelPrice("claude-sonnet-5")).toEqual({ input: 2, output: 10 });
    expect(modelPrice("claude-opus-4-8")).toEqual({ input: 5, output: 25 });
    expect(modelPrice("claude-opus-5-5")).toEqual({ input: 4, output: 20 });
    expect(modelPrice("claude-fable-5-1")).toEqual({ input: 10, output: 50 });
  });

  it("falls back to Opus pricing for an unknown model", () => {
    expect(modelPrice("something-new")).toEqual({ input: 5, output: 25 });
  });

  it("charges input and output tokens in micro-dollars", () => {
    expect(costMicroUsd("claude-haiku-4-5", usage({ input_tokens: 3000, output_tokens: 400 }))).toBe(5000);
  });

  it("weights cache writes at 1.25x and cache reads at 0.1x input", () => {
    expect(costMicroUsd("claude-sonnet-4-6", usage({ cache_creation_input_tokens: 1000 }))).toBe(3750);
    expect(costMicroUsd("claude-sonnet-4-6", usage({ cache_read_input_tokens: 1000 }))).toBe(300);
  });

  it("adds $0.01 per web search", () => {
    expect(costMicroUsd("claude-sonnet-4-6", usage({ server_tool_use: { web_search_requests: 3 } }))).toBe(30_000);
  });

  it("tolerates missing/null usage fields", () => {
    expect(costMicroUsd("claude-haiku-4-5", usage({ cache_creation_input_tokens: null, server_tool_use: null }))).toBe(0);
  });
});
