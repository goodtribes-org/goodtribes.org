import { aiProvider, isAiEnabled, toVertexModelId } from "../lib/anthropic";

jest.mock("../lib/rateLimit", () => ({ checkRateLimit: jest.fn() }));

const ENV_KEYS = ["AI_PROVIDER", "ANTHROPIC_API_KEY", "GOOGLE_VERTEX_PROJECT_ID"] as const;

describe("AI provider selection", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => ENV_KEYS.forEach((k) => { saved[k] = process.env[k]; delete process.env[k]; }));
  afterEach(() => ENV_KEYS.forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }));

  it("defaults to the Claude API, keyed by ANTHROPIC_API_KEY", () => {
    expect(aiProvider()).toBe("anthropic");
    expect(isAiEnabled()).toBe(false);
    process.env.ANTHROPIC_API_KEY = "sk-test";
    expect(isAiEnabled()).toBe(true);
  });

  it("uses Vertex when AI_PROVIDER=vertex, keyed by the Google project, not the Anthropic key", () => {
    process.env.AI_PROVIDER = " Vertex ";
    process.env.ANTHROPIC_API_KEY = "sk-test";
    expect(aiProvider()).toBe("vertex");
    expect(isAiEnabled()).toBe(false);
    process.env.GOOGLE_VERTEX_PROJECT_ID = "goodtribes";
    expect(isAiEnabled()).toBe(true);
  });

  it("falls back to the Claude API for unknown provider values", () => {
    process.env.AI_PROVIDER = "gemini";
    expect(aiProvider()).toBe("anthropic");
  });
});

describe("toVertexModelId", () => {
  it("rewrites dated snapshots to Vertex's @ form", () => {
    expect(toVertexModelId("claude-haiku-4-5-20251001")).toBe("claude-haiku-4-5@20251001");
  });
  it("leaves undated IDs unchanged", () => {
    expect(toVertexModelId("claude-sonnet-4-6")).toBe("claude-sonnet-4-6");
    expect(toVertexModelId("claude-opus-4-8")).toBe("claude-opus-4-8");
  });
});
