import type AnthropicSdk from "@anthropic-ai/sdk";
import { checkRateLimit } from "@/lib/rateLimit";

// Which platform serves the Claude models. "anthropic" (default) is the
// first-party Claude API, keyed by ANTHROPIC_API_KEY. "vertex" is Claude on
// Google Cloud Vertex AI (paid from GoodTribes' Google Cloud credits), keyed
// by GOOGLE_VERTEX_PROJECT_ID plus a service account — see
// createAnthropicClient. Same models, same messages.create surface; the one
// thing Vertex lacks that we could use is the Batch API.
export type AiProvider = "anthropic" | "vertex";

export function aiProvider(): AiProvider {
  return process.env.AI_PROVIDER?.trim().toLowerCase() === "vertex" ? "vertex" : "anthropic";
}

// Every AI feature is gated on this and must degrade gracefully when it's
// unset (feature unavailable, never a crash) — see CLAUDE.md's AI features
// note. Centralized so a call site can't forget the check the way
// /api/maturity's report generation once did.
export function isAiEnabled(): boolean {
  return aiProvider() === "vertex" ? !!process.env.GOOGLE_VERTEX_PROJECT_ID : !!process.env.ANTHROPIC_API_KEY;
}

// Vertex names dated model snapshots with "@" ("claude-haiku-4-5@20251001")
// where the Claude API uses "-" ("claude-haiku-4-5-20251001"); undated IDs
// ("claude-sonnet-4-6") are the same on both. Call sites keep the Claude API
// spelling and this translates.
export function toVertexModelId(model: string): string {
  return model.replace(/^(claude-.+)-(\d{8})$/, "$1@$2");
}

function withVertexModelIds(client: AnthropicSdk): AnthropicSdk {
  const create = client.messages.create.bind(client.messages) as (
    params: AnthropicSdk.MessageCreateParams,
    options?: AnthropicSdk.RequestOptions,
  ) => unknown;
  const messages = Object.create(client.messages, {
    create: {
      value: (params: AnthropicSdk.MessageCreateParams, options?: AnthropicSdk.RequestOptions) =>
        create({ ...params, model: toVertexModelId(params.model) }, options),
    },
  });
  return Object.create(client, { messages: { value: messages } }) as AnthropicSdk;
}

// Credentials: GOOGLE_VERTEX_CREDENTIALS_JSON holds a service account key as
// JSON (how it reaches the pods from goodtribes-secret); without it the
// Google auth library's default lookup applies (GOOGLE_APPLICATION_CREDENTIALS,
// gcloud login locally, workload identity in-cluster).
async function createVertexClient(): Promise<AnthropicSdk> {
  const { AnthropicVertex } = await import("@anthropic-ai/vertex-sdk");
  const { GoogleAuth } = await import("google-auth-library");
  const json = process.env.GOOGLE_VERTEX_CREDENTIALS_JSON;
  const googleAuth = new GoogleAuth({
    scopes: "https://www.googleapis.com/auth/cloud-platform",
    ...(json ? { credentials: JSON.parse(json) } : {}),
  });
  const client = new AnthropicVertex({
    projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
    region: process.env.GOOGLE_VERTEX_REGION || "global",
    googleAuth,
  });
  // Only messages.create is used anywhere (checked when Vertex was added);
  // the Vertex client has no batches/models resources, hence the cast.
  return withVertexModelIds(client as unknown as AnthropicSdk);
}

// Every AI call spends real Anthropic API money, unlike the social actions
// rate-limited in socialActionGuard.ts — capped per hour rather than per
// minute, since a single automated/compromised account could otherwise run
// up unbounded spend with no signal until the bill arrives. Tightened from
// 20 to 10/hour 2026-09-29 while running on a capped Vertex AI credit
// balance (see CLAUDE.md's AI provider note) — still covers legitimate
// interactive use with room to spare, while bounding worst case per account
// harder during the capped-credit period.
const AI_RATE_LIMIT = 10;
const AI_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export function checkAiRateLimit(userId: string): Promise<boolean> {
  return checkRateLimit(`rl:ai:${userId}`, AI_RATE_LIMIT, AI_RATE_LIMIT_WINDOW_SECONDS);
}

// A ceiling per project on top of the per-user limit: the AI-guided start
// and later the AI project manager can run many calls for one project
// without anyone clicking, so a project gets a monthly budget of calls
// (default 60 / 30 days — a Drömsamtal plus the Idé fill is ~15, so this
// still covers several full runs per project). Lowered from 150 to 60
// 2026-09-29 alongside AI_RATE_LIMIT, same capped-credit reason. Tunable
// via AI_PROJECT_MONTHLY_LIMIT. Fails open on a Redis outage, like every
// rate limit here.
const AI_PROJECT_BUDGET_WINDOW_SECONDS = 30 * 24 * 60 * 60;
export function aiProjectMonthlyLimit(): number {
  const n = Number(process.env.AI_PROJECT_MONTHLY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 60;
}

export function checkAiProjectBudget(projectId: string): Promise<boolean> {
  return checkRateLimit(`rl:ai:project:${projectId}`, aiProjectMonthlyLimit(), AI_PROJECT_BUDGET_WINDOW_SECONDS);
}

// Prompt-caching helpers (2026-09-29), for call sites that resend a growing
// conversation history on every turn (aiThreadReply.ts, dreamReply.ts) — the
// single biggest remaining spend lever after the model/rate-limit trims
// done the same day (see CLAUDE.md's AI provider note), since those two
// currently re-pay for the whole prior conversation every single turn.
// Anthropic's "ephemeral" cache breakpoint lasts ~5 minutes and is a no-op
// (not an error) on a miss — safe to always attach, worst case is "no
// saving this time", never a broken response. Support is inherited from the
// base SDK's typed surface (the Vertex client's MessagesResource type is a
// direct Omit<> of the same Messages resource, see @anthropic-ai/vertex-sdk
// client.d.ts) rather than confirmed against a live Vertex call, since the
// quota needed to test that is still pending Google's review as of writing.
const CACHE_CONTROL: AnthropicSdk.CacheControlEphemeral = { type: "ephemeral" };

// A static system prompt, wrapped as a single cached block.
export function cachedSystemBlock(text: string): AnthropicSdk.TextBlockParam[] {
  return [{ type: "text", text, cache_control: CACHE_CONTROL }];
}

// Standard multi-turn caching pattern: mark the second-to-last message (the
// last message of everything BEFORE this turn's new final message) with a
// cache breakpoint. Next turn, that same prefix — now one message
// shorter than the full history — is still a cache hit, and a new
// breakpoint is set one message further along. No-ops (returns the
// messages unchanged) when there's nothing meaningful to cache yet, or
// when the target message isn't plain-string content already.
export function withCacheBreakpoint(messages: AnthropicSdk.MessageParam[]): AnthropicSdk.MessageParam[] {
  if (messages.length < 2) return messages;
  const i = messages.length - 2;
  const target = messages[i];
  if (typeof target.content !== "string") return messages;
  return messages.map((m, idx) =>
    idx === i
      ? { role: m.role, content: [{ type: "text", text: target.content as string, cache_control: CACHE_CONTROL }] }
      : m,
  );
}

// Returns null when the provider isn't configured (see isAiEnabled) instead
// of constructing a client that would throw on first use.
//
// Do NOT call this from feature code: every AI call must go through
// getAiClientFor() in lib/aiMode.ts, which also enforces the project's AI
// mode (AGENT/ASSIST/MANUAL) and the rate limit. __tests__/aiGate.test.ts
// fails if anything other than lib/aiMode.ts imports this.
export async function createAnthropicClient(): Promise<AnthropicSdk | null> {
  if (!isAiEnabled()) return null;
  if (aiProvider() === "vertex") return createVertexClient();
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  return new Anthropic();
}
