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

// Returns null when ANTHROPIC_API_KEY is unset instead of constructing a
// client that would throw synchronously on first use — callers should
// treat null as "feature unavailable" and respond accordingly.
export async function getAnthropicClient(): Promise<AnthropicSdk | null> {
  if (!isAiEnabled()) return null;
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  return new Anthropic();
}
