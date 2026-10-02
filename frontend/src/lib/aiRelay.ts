import type AnthropicSdk from "@anthropic-ai/sdk";
import { mkdir, readFile, rename, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";

// AI_PROVIDER=relay — development only. Every messages.create is written as
// a JSON file to <AI_RELAY_DIR>/requests/<id>.json and answered by whoever
// writes <AI_RELAY_DIR>/responses/<id>.json: a person, or a Claude Code
// session playing the AI, so every AI flow can be tested locally without
// API credit. The call waits for the answer (AI_RELAY_TIMEOUT_MS, default
// 15 minutes) and then behaves exactly like a Claude API response.
//
// A response file is either a full Message, or just { "content": [...] }
// (text and tool_use blocks, as the Messages API returns them), or the
// shorthand { "text": "..." }. stop_reason is derived when left out.

const POLL_MS = 400;

export function relayDir(): string {
  return process.env.AI_RELAY_DIR || path.join(tmpdir(), "goodtribes-ai-relay");
}

type RelayResponse = Partial<AnthropicSdk.Message> & { text?: string };

function toMessage(id: string, model: string, r: RelayResponse): AnthropicSdk.Message {
  const content = (r.content ?? [{ type: "text", text: r.text ?? "" }]) as AnthropicSdk.ContentBlock[];
  const usesTool = content.some((b) => b.type === "tool_use");
  return {
    id: r.id ?? `msg_relay_${id}`,
    type: "message",
    role: "assistant",
    model: r.model ?? model,
    content: content.map((b) => (b.type === "text" ? { ...b, citations: b.citations ?? null } : b)) as AnthropicSdk.ContentBlock[],
    stop_reason: r.stop_reason ?? (usesTool ? "tool_use" : "end_turn"),
    stop_sequence: r.stop_sequence ?? null,
    usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, server_tool_use: null, service_tier: null, ...(r.usage ?? {}) },
  } as AnthropicSdk.Message;
}

async function relayCreate(params: AnthropicSdk.MessageCreateParams): Promise<AnthropicSdk.Message> {
  const dir = relayDir();
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  await mkdir(path.join(dir, "requests"), { recursive: true });
  await mkdir(path.join(dir, "responses"), { recursive: true });
  await mkdir(path.join(dir, "done"), { recursive: true });
  const requestFile = path.join(dir, "requests", `${id}.json`);
  const responseFile = path.join(dir, "responses", `${id}.json`);
  await writeFile(requestFile, JSON.stringify(params, null, 2));
  logger.info("ai relay: waiting for an answer", { id, model: params.model });

  const timeout = Number(process.env.AI_RELAY_TIMEOUT_MS) || 15 * 60 * 1000;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    let raw: string | null = null;
    try {
      raw = await readFile(responseFile, "utf8");
    } catch {
      // not answered yet
    }
    if (raw !== null) {
      try {
        const message = toMessage(id, params.model, JSON.parse(raw) as RelayResponse);
        await rename(requestFile, path.join(dir, "done", `${id}.request.json`)).catch(() => {});
        await rename(responseFile, path.join(dir, "done", `${id}.response.json`)).catch(() => {});
        return message;
      } catch {
        // half-written file — read it again on the next tick
      }
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  await rm(requestFile, { force: true });
  throw new Error(`AI relay: no answer for ${id} within ${Math.round(timeout / 1000)}s`);
}

export function createRelayClient(): AnthropicSdk {
  return { messages: { create: (params: AnthropicSdk.MessageCreateParams) => relayCreate(params) } } as unknown as AnthropicSdk;
}
