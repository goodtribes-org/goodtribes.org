// Shared list of AI-capable tools a project can independently set to
// AGENT/MANUAL (see ToolAiPreference in prisma/schema/ai.prisma). A
// constant list rather than free strings at each call site, to avoid
// typo-drift as more tools get an AI entry point.
export const AI_TOOL_KEYS = [
  { key: "kanban-agent", labelKey: "kanbanAgent" },
  { key: "task-estimate", labelKey: "taskEstimate" },
  { key: "mindmap", labelKey: "mindmap" },
  { key: "maturity-report", labelKey: "maturityReport" },
  { key: "network-insights", labelKey: "networkInsights" },
  { key: "ai-thread-reply", labelKey: "aiThreadReply" },
  { key: "sdg-suggestion", labelKey: "sdgSuggestion" },
  { key: "funding-applications", labelKey: "fundingApplications" },
] as const;

export type AiToolKey = (typeof AI_TOOL_KEYS)[number]["key"];

export function isKnownAiToolKey(value: string): value is AiToolKey {
  return AI_TOOL_KEYS.some((t) => t.key === value);
}
