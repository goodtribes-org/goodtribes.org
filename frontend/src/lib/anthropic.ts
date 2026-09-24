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
