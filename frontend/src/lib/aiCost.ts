import type AnthropicSdk from "@anthropic-ai/sdk";

// What one messages.create call cost, from the response's usage block —
// what the project AI budget is charged (see recordAiProjectSpend in
// lib/anthropic.ts). Prices are Anthropic's first-party list prices; Vertex
// bills Claude separately, so on Vertex these are relative weights (Haiku
// cheap, Opus expensive, web search extra), not the exact invoice. That's
// all the budget needs: a cheap iteration must cost a fraction of a full
// phase fill.
//
// $X per million tokens = X micro-dollars per token, so the table is in
// $/MTok and costs come out in whole micro-dollars.

type Price = { input: number; output: number };

// First match wins — more specific IDs before their family. Unknown models
// fall back to Opus pricing: overcharging the budget is safer than letting
// a new expensive model through as if it were free.
const PRICES: [RegExp, Price][] = [
  [/^claude-(fable|mythos)/, { input: 10, output: 50 }],
  [/^claude-opus-5-5/, { input: 4, output: 20 }],
  [/^claude-opus/, { input: 5, output: 25 }],
  [/^claude-sonnet-5/, { input: 2, output: 10 }],
  [/^claude-sonnet/, { input: 3, output: 15 }],
  [/^claude-haiku/, { input: 1, output: 5 }],
];
const FALLBACK_PRICE: Price = { input: 5, output: 25 };

// Cache writes (5-minute TTL, the only one used here — see
// cachedSystemBlock) cost 1.25x input, cache reads 0.1x.
const CACHE_WRITE_FACTOR = 1.25;
const CACHE_READ_FACTOR = 0.1;
// Web search is billed per search: $10 per 1 000.
const WEB_SEARCH_MICRO_USD = 10_000;

export function modelPrice(model: string): Price {
  for (const [re, price] of PRICES) if (re.test(model)) return price;
  return FALLBACK_PRICE;
}

export function costMicroUsd(model: string, usage: AnthropicSdk.Usage): number {
  const p = modelPrice(model);
  const tokens =
    (usage.input_tokens ?? 0) * p.input +
    (usage.output_tokens ?? 0) * p.output +
    (usage.cache_creation_input_tokens ?? 0) * p.input * CACHE_WRITE_FACTOR +
    (usage.cache_read_input_tokens ?? 0) * p.input * CACHE_READ_FACTOR;
  const searches = (usage.server_tool_use?.web_search_requests ?? 0) * WEB_SEARCH_MICRO_USD;
  return Math.ceil(tokens + searches);
}
