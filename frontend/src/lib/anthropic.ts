import type AnthropicSdk from "@anthropic-ai/sdk";

// Every AI feature is gated on this and must degrade gracefully when it's
// unset (feature unavailable, never a crash) — see CLAUDE.md's AI features
// note. Centralized so a call site can't forget the check the way
// /api/maturity's report generation once did.
export function isAiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Returns null when ANTHROPIC_API_KEY is unset instead of constructing a
// client that would throw synchronously on first use — callers should
// treat null as "feature unavailable" and respond accordingly.
export async function getAnthropicClient(): Promise<AnthropicSdk | null> {
  if (!isAiEnabled()) return null;
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  return new Anthropic();
}
