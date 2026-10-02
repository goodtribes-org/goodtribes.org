#!/usr/bin/env node
// Answer the app's AI calls by hand when it runs with AI_PROVIDER=relay
// (development only, see src/lib/aiRelay.ts). Dependency-free.
//
//   node scripts/ai-relay.mjs list                 waiting calls
//   node scripts/ai-relay.mjs show <id> [--full]   one call: system, tools, last messages
//   node scripts/ai-relay.mjs answer <id> <file>   send <file> (JSON) as the answer
//   node scripts/ai-relay.mjs text <id> "<text>"   answer with plain text
//
// <id> is the file name in requests/ (with or without .json). An answer is
// { "content": [ ...text/tool_use blocks... ] } or { "text": "..." }; a call
// that forces a tool (tool_choice) needs a tool_use block with that name.
// AI_RELAY_DIR picks the directory (default: <tmp>/goodtribes-ai-relay).

import { readFileSync, readdirSync, renameSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const dir = process.env.AI_RELAY_DIR || path.join(tmpdir(), "goodtribes-ai-relay");
const [cmd, rawId, arg] = process.argv.slice(2);
const full = process.argv.includes("--full");
const id = rawId?.replace(/\.json$/, "");

const textOf = (c) => (typeof c === "string" ? c : c.map((b) => b.text ?? JSON.stringify(b)).join("\n"));
const cut = (s, n) => (full || s.length <= n ? s : `${s.slice(0, n)} …`);

function write(answer) {
  mkdirSync(path.join(dir, "responses"), { recursive: true });
  const tmp = path.join(dir, "responses", `${id}.json.tmp`);
  writeFileSync(tmp, JSON.stringify(answer));
  renameSync(tmp, path.join(dir, "responses", `${id}.json`));
  console.log(`answered ${id}`);
}

if (cmd === "list") {
  let files = [];
  try {
    files = readdirSync(path.join(dir, "requests")).filter((f) => f.endsWith(".json"));
  } catch {}
  console.log(files.length ? files.join("\n") : "(nothing waiting)");
} else if (cmd === "show" && id) {
  const r = JSON.parse(readFileSync(path.join(dir, "requests", `${id}.json`), "utf8"));
  const system = Array.isArray(r.system) ? r.system.map((b) => b.text).join("\n") : (r.system ?? "");
  console.log(`model ${r.model}, max_tokens ${r.max_tokens}`);
  console.log(`--- system ---\n${cut(system, 3000)}`);
  for (const t of r.tools ?? []) console.log(`--- tool ${t.name ?? t.type} ---\n${cut(JSON.stringify(t.input_schema ?? {}), 2500)}`);
  if (r.tool_choice) console.log(`tool_choice ${JSON.stringify(r.tool_choice)}`);
  const msgs = full ? r.messages : r.messages.slice(-6);
  console.log(`--- messages (${r.messages.length}) ---`);
  for (const m of msgs) console.log(`[${m.role}] ${cut(textOf(m.content), 3000)}`);
} else if (cmd === "answer" && id && arg) {
  write(JSON.parse(readFileSync(arg, "utf8")));
} else if (cmd === "text" && id && arg) {
  write({ text: arg });
} else {
  console.log("usage: ai-relay.mjs list | show <id> [--full] | answer <id> <file.json> | text <id> \"<text>\"");
  process.exit(1);
}
