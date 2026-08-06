// Extension point for AI-generated phase summaries, gated by
// Sprint.aiSummaryEnabled (currently always false — no UI sets it to true
// yet). TODO: once enabled, call the Anthropic API here (see this repo's
// other ANTHROPIC_API_KEY-gated AI features, e.g.
// src/app/api/cron/sandbox-seed/route.ts) to summarize a phase's
// contributions/documentState into a short recap. Never call any AI API
// from here until that's actually wired up.
export async function generatePhaseSummary(sprintPhaseId: string): Promise<string | null> {
  return null;
}
