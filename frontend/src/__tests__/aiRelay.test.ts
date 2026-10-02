import { mkdtempSync, readdirSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

jest.mock("../lib/logger", () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

import { createRelayClient } from "../lib/aiRelay";

async function waitForRequest(dir: string): Promise<string> {
  for (let i = 0; i < 50; i++) {
    try {
      const f = readdirSync(path.join(dir, "requests")).find((n) => n.endsWith(".json"));
      if (f) return f;
    } catch {}
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("no request written");
}

describe("AI relay", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "relay-test-"));
    process.env.AI_RELAY_DIR = dir;
  });

  it("writes the call and returns the answer as a Message", async () => {
    const client = createRelayClient();
    const call = client.messages.create({ model: "claude-sonnet-4-6", max_tokens: 100, messages: [{ role: "user", content: "hej" }] });
    const f = await waitForRequest(dir);
    expect(JSON.parse(readFileSync(path.join(dir, "requests", f), "utf8")).messages[0].content).toBe("hej");
    writeFileSync(path.join(dir, "responses", f), JSON.stringify({ text: "hej själv" }));
    const msg = await call;
    expect(msg.content[0]).toMatchObject({ type: "text", text: "hej själv" });
    expect(msg.stop_reason).toBe("end_turn");
    expect(readdirSync(path.join(dir, "requests"))).toHaveLength(0);
  });

  it("a tool_use answer stops for the tool", async () => {
    const call = createRelayClient().messages.create({ model: "m", max_tokens: 10, messages: [{ role: "user", content: "x" }] });
    const f = await waitForRequest(dir);
    writeFileSync(path.join(dir, "responses", f), JSON.stringify({ content: [{ type: "tool_use", id: "t1", name: "svara", input: { reply: "ok" } }] }));
    const msg = await call;
    expect(msg.stop_reason).toBe("tool_use");
    expect(msg.content[0]).toMatchObject({ type: "tool_use", name: "svara", input: { reply: "ok" } });
  });

  it("gives up after the timeout", async () => {
    process.env.AI_RELAY_TIMEOUT_MS = "300";
    await expect(createRelayClient().messages.create({ model: "m", max_tokens: 10, messages: [{ role: "user", content: "x" }] })).rejects.toThrow(/no answer/);
    delete process.env.AI_RELAY_TIMEOUT_MS;
  });
});
