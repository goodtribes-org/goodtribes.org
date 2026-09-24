import type AnthropicSdk from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";

// List prices per million tokens (Claude API, first party) for the models
// this app calls, plus web search per call. Used only to put a rough cost
// on each logged call — the invoice is the source of truth.
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
};
const WEB_SEARCH_USD = 0.01;

type Usage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number } | null;
};

// Cache reads bill at 0.1x and cache writes at 1.25x the input price.
export function estimateCostUsd(model: string, u: Usage): number | null {
  const p = PRICE_PER_MTOK[model];
  if (!p) return null;
  const input =
    (u.input_tokens ?? 0) * p.input +
    (u.cache_read_input_tokens ?? 0) * p.input * 0.1 +
    (u.cache_creation_input_tokens ?? 0) * p.input * 1.25;
  const output = (u.output_tokens ?? 0) * p.output;
  const searches = (u.server_tool_use?.web_search_requests ?? 0) * WEB_SEARCH_USD;
  return Math.round(((input + output) / 1_000_000 + searches) * 10_000) / 10_000;
}

// One structured log line per AI call ("ai usage"), so real cost per
// feature and project can be read from the logs. Same wrapping approach as
// withLanguageClient; callers only ever await messages.create.
export function withUsageLogging(client: AnthropicSdk, ctx: { feature: string; projectId: string | null }): AnthropicSdk {
  const create = client.messages.create.bind(client.messages) as (
    params: AnthropicSdk.MessageCreateParams,
    options?: AnthropicSdk.RequestOptions,
  ) => Promise<unknown>;
  const messages = Object.create(client.messages, {
    create: {
      value: async (params: AnthropicSdk.MessageCreateParams, options?: AnthropicSdk.RequestOptions) => {
        const response = await create(params, options);
        const usage = (response as { usage?: Usage } | null)?.usage;
        if (usage) {
          logger.info("ai usage", {
            feature: ctx.feature,
            projectId: ctx.projectId,
            model: params.model,
            inputTokens: usage.input_tokens ?? 0,
            outputTokens: usage.output_tokens ?? 0,
            cacheReadTokens: usage.cache_read_input_tokens ?? 0,
            cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
            webSearches: usage.server_tool_use?.web_search_requests ?? 0,
            estimatedUsd: estimateCostUsd(params.model, usage),
          });
        }
        return response;
      },
    },
  });
  return Object.create(client, { messages: { value: messages } }) as AnthropicSdk;
}
