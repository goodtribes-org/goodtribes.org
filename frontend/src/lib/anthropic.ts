import type AnthropicSdk from "@anthropic-ai/sdk";
import { checkRateLimit } from "@/lib/rateLimit";

// Every AI feature is gated on this and must degrade gracefully when it's
// unset (feature unavailable, never a crash) — see CLAUDE.md's AI features
// note. Centralized so a call site can't forget the check the way
// /api/maturity's report generation once did.
export function isAiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Every AI call spends real Anthropic API money, unlike the social actions
// rate-limited in socialActionGuard.ts — capped per hour rather than per
// minute, since a single automated/compromised account could otherwise run
// up unbounded spend with no signal until the bill arrives. 20/hour covers
// legitimate interactive use (kanban AI agent runs, maturity reports,
// mindmap generation, AI thread replies, task estimates) with room to
// spare, while bounding worst case per account.
const AI_RATE_LIMIT = 20;
const AI_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export function checkAiRateLimit(userId: string): Promise<boolean> {
  return checkRateLimit(`rl:ai:${userId}`, AI_RATE_LIMIT, AI_RATE_LIMIT_WINDOW_SECONDS);
}

// A ceiling per project on top of the per-user limit: the AI-guided start
// and later the AI project manager can run many calls for one project
// without anyone clicking, so a project gets a monthly budget of calls
// (default 150 / 30 days — a Drömsamtal plus the Idé fill is ~15). Tunable
// via AI_PROJECT_MONTHLY_LIMIT. Fails open on a Redis outage, like every
// rate limit here.
const AI_PROJECT_BUDGET_WINDOW_SECONDS = 30 * 24 * 60 * 60;
export function aiProjectMonthlyLimit(): number {
  const n = Number(process.env.AI_PROJECT_MONTHLY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 150;
}

export function checkAiProjectBudget(projectId: string): Promise<boolean> {
  return checkRateLimit(`rl:ai:project:${projectId}`, aiProjectMonthlyLimit(), AI_PROJECT_BUDGET_WINDOW_SECONDS);
}

// Returns null when ANTHROPIC_API_KEY is unset instead of constructing a
// client that would throw synchronously on first use.
//
// Do NOT call this from feature code: every AI call must go through
// getAiClientFor() in lib/aiMode.ts, which also enforces the project's AI
// mode (AGENT/ASSIST/MANUAL) and the rate limit. __tests__/aiGate.test.ts
// fails if anything other than lib/aiMode.ts imports this.
export async function createAnthropicClient(): Promise<AnthropicSdk | null> {
  if (!isAiEnabled()) return null;
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  return new Anthropic();
}
