import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

const projectFindUnique = jest.fn();
const phaseFindUnique = jest.fn();
const stepFindUnique = jest.fn();
const toolFindUnique = jest.fn();
const createAnthropicClient = jest.fn();
const checkAiRateLimit = jest.fn();
let aiEnabled = true;

jest.mock("../lib/prisma", () => ({
  prisma: {
    project: { findUnique: (...a: unknown[]) => projectFindUnique(...a) },
    projectPhaseAiSetting: { findUnique: (...a: unknown[]) => phaseFindUnique(...a) },
    projectStepAiSetting: { findUnique: (...a: unknown[]) => stepFindUnique(...a) },
    toolAiPreference: { findUnique: (...a: unknown[]) => toolFindUnique(...a) },
  },
}));
jest.mock("../lib/anthropic", () => ({
  isAiEnabled: () => aiEnabled,
  checkAiRateLimit: (...a: unknown[]) => checkAiRateLimit(...a),
  createAnthropicClient: (...a: unknown[]) => createAnthropicClient(...a),
}));

import { getAiClientFor, isAiCallAllowed, resolveAiModeFrom } from "../lib/aiMode";

describe("isAiCallAllowed", () => {
  it("AGENT allows everything, ASSIST only assist calls, MANUAL nothing", () => {
    expect(isAiCallAllowed("AGENT", "agent")).toBe(true);
    expect(isAiCallAllowed("AGENT", "assist")).toBe(true);
    expect(isAiCallAllowed("ASSIST", "agent")).toBe(false);
    expect(isAiCallAllowed("ASSIST", "assist")).toBe(true);
    expect(isAiCallAllowed("MANUAL", "agent")).toBe(false);
    expect(isAiCallAllowed("MANUAL", "assist")).toBe(false);
  });
});

describe("resolveAiModeFrom", () => {
  it("the most specific level wins: step → tool → phase → project", () => {
    const all = { step: "MANUAL", tool: "ASSIST", phase: "AGENT", project: "ASSIST" } as const;
    expect(resolveAiModeFrom(all, "mindmap")).toEqual({ mode: "MANUAL", source: "step" });
    expect(resolveAiModeFrom({ ...all, step: null }, "mindmap")).toEqual({ mode: "ASSIST", source: "tool" });
    expect(resolveAiModeFrom({ ...all, step: null, tool: null }, "mindmap")).toEqual({ mode: "AGENT", source: "phase" });
    expect(resolveAiModeFrom({ project: "MANUAL" }, "mindmap")).toEqual({ mode: "MANUAL", source: "project" });
  });

  it("features without a tool setting skip the tool level", () => {
    expect(resolveAiModeFrom({ phase: "ASSIST", project: "AGENT" }, "translation")).toEqual({ mode: "ASSIST", source: "phase" });
  });

  describe("legacy projects (no project mode) behave exactly as before AI modes", () => {
    it("tools that never read their setting keep running unconditionally", () => {
      for (const feature of ["mindmap", "task-estimate", "maturity-report", "network-insights", "ai-thread-reply", "sdg-suggestion", "translation"] as const) {
        const r = resolveAiModeFrom({}, feature);
        expect(r).toEqual({ mode: "AGENT", source: "legacy" });
      }
    });

    it("a stray tool row for such a tool is still ignored, as before", () => {
      expect(resolveAiModeFrom({ tool: "MANUAL" }, "mindmap")).toEqual({ mode: "AGENT", source: "legacy" });
    });

    it("kanban-agent and funding-applications still need an explicit AGENT row for agent work", () => {
      for (const feature of ["kanban-agent", "funding-applications"] as const) {
        const none = resolveAiModeFrom({}, feature);
        expect(isAiCallAllowed(none.mode, "agent")).toBe(false);
        expect(resolveAiModeFrom({ tool: "AGENT" }, feature)).toEqual({ mode: "AGENT", source: "tool" });
        expect(isAiCallAllowed(resolveAiModeFrom({ tool: "MANUAL" }, feature).mode, "agent")).toBe(false);
      }
    });
  });

  it("in a project with a mode, every tool row counts", () => {
    expect(resolveAiModeFrom({ tool: "MANUAL", project: "AGENT" }, "mindmap")).toEqual({ mode: "MANUAL", source: "tool" });
  });
});

describe("getAiClientFor", () => {
  const fakeClient = { messages: { create: jest.fn() } };

  beforeEach(() => {
    aiEnabled = true;
    [projectFindUnique, phaseFindUnique, stepFindUnique, toolFindUnique, createAnthropicClient, checkAiRateLimit].forEach((m) => m.mockReset());
    phaseFindUnique.mockResolvedValue(null);
    stepFindUnique.mockResolvedValue(null);
    toolFindUnique.mockResolvedValue(null);
    checkAiRateLimit.mockResolvedValue(true);
    createAnthropicClient.mockResolvedValue(fakeClient);
  });

  it("MANUAL never creates a client and never spends rate-limit quota", async () => {
    projectFindUnique.mockResolvedValue({ aiMode: "MANUAL", phase: "IDEA" });
    for (const kind of ["agent", "assist"] as const) {
      const r = await getAiClientFor({ feature: "mindmap", kind, userId: "u1", projectId: "p1" });
      expect(r).toEqual({ ok: false, reason: "mode", mode: "MANUAL" });
    }
    expect(createAnthropicClient).not.toHaveBeenCalled();
    expect(checkAiRateLimit).not.toHaveBeenCalled();
  });

  it("a MANUAL step overrides an AGENT project", async () => {
    projectFindUnique.mockResolvedValue({ aiMode: "AGENT", phase: "IDEA" });
    stepFindUnique.mockResolvedValue({ aiMode: "MANUAL" });
    const r = await getAiClientFor({ feature: "sdg-suggestion", kind: "assist", userId: "u1", projectId: "p1", stepKey: "ai_reviewed" });
    expect(r.ok).toBe(false);
    expect(createAnthropicClient).not.toHaveBeenCalled();
  });

  it("ASSIST blocks agent work but allows assist calls", async () => {
    projectFindUnique.mockResolvedValue({ aiMode: "ASSIST", phase: "IDEA" });
    await expect(getAiClientFor({ feature: "kanban-agent", kind: "agent", userId: "u1", projectId: "p1" })).resolves.toMatchObject({ ok: false, reason: "mode" });
    await expect(getAiClientFor({ feature: "mindmap", kind: "assist", userId: "u1", projectId: "p1" })).resolves.toMatchObject({ ok: true, mode: "ASSIST" });
    expect(createAnthropicClient).toHaveBeenCalledTimes(1);
  });

  it("looks up the phase setting by display phase (SPRINT counts as IDEA)", async () => {
    projectFindUnique.mockResolvedValue({ aiMode: "AGENT", phase: "SPRINT" });
    await getAiClientFor({ feature: "mindmap", kind: "assist", userId: "u1", projectId: "p1" });
    expect(phaseFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId_phase: { projectId: "p1", phase: "IDEA" } } }),
    );
  });

  it("reports rate limiting without creating a client", async () => {
    projectFindUnique.mockResolvedValue({ aiMode: "AGENT", phase: "IDEA" });
    checkAiRateLimit.mockResolvedValue(false);
    await expect(getAiClientFor({ feature: "mindmap", kind: "assist", userId: "u1", projectId: "p1" })).resolves.toMatchObject({ ok: false, reason: "rate_limited" });
    expect(createAnthropicClient).not.toHaveBeenCalled();
  });

  it("returns not_configured before touching the database when AI is off", async () => {
    aiEnabled = false;
    await expect(getAiClientFor({ feature: "mindmap", kind: "assist", userId: "u1", projectId: "p1" })).resolves.toEqual({ ok: false, reason: "not_configured" });
    expect(projectFindUnique).not.toHaveBeenCalled();
  });

  it("calls without a project only need configuration; system jobs skip the rate limit", async () => {
    await expect(getAiClientFor({ feature: "sandbox-seed", kind: "agent", userId: null, projectId: null })).resolves.toMatchObject({ ok: true });
    expect(projectFindUnique).not.toHaveBeenCalled();
    expect(checkAiRateLimit).not.toHaveBeenCalled();
  });
});

// Static guard: every AI call must go through getAiClientFor. Fails if any
// file other than lib/anthropic.ts / lib/aiMode.ts creates a client, imports
// the SDK at runtime, or calls the Anthropic HTTP API directly.
describe("no AI call bypasses the gate", () => {
  const srcDir = path.join(__dirname, "..");
  const allowed = new Set([path.join(srcDir, "lib", "anthropic.ts"), path.join(srcDir, "lib", "aiMode.ts")]);

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (full === __dirname) return [];
      if (statSync(full).isDirectory()) return walk(full);
      return /\.(ts|tsx)$/.test(name) ? [full] : [];
    });
  }

  it("only the gate touches the client", () => {
    const offenders = walk(srcDir)
      .filter((f) => !allowed.has(f))
      .filter((f) => {
        const src = readFileSync(f, "utf8");
        return (
          /createAnthropicClient|getAnthropicClient|checkAiRateLimit/.test(src) ||
          /api\.anthropic\.com/.test(src) ||
          // A type-only import of the SDK is harmless; a runtime one isn't.
          /import\s+(?!type\b)[^;]*from\s+["']@anthropic-ai\/sdk["']/.test(src) ||
          /import\(\s*["']@anthropic-ai\/sdk["']\s*\)/.test(src)
        );
      })
      .map((f) => path.relative(srcDir, f));
    expect(offenders).toEqual([]);
  });
});
