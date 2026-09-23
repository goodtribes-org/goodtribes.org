import type Anthropic from "@anthropic-ai/sdk";
import type { AiMode, FieldKnowledgeStatus, MarketScanEntryType, ProjectAmbition, TeamMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/categories";
import { logger } from "@/lib/logger";
import { getAiClientFor } from "@/lib/aiMode";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { escapeHtml } from "@/lib/renderBody";
import { getFieldProvenance, recordAiWrite } from "@/lib/fieldProvenance";
import { createAiSuggestion, decideAiPlacement } from "@/lib/aiSuggestions";
import { LEAN_CANVAS_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { VALUE_PROPOSITION_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/value-proposition/fields";
import {
  BASICS_SYSTEM_PROMPT,
  BASICS_TOOL,
  INTERVIEW_GUIDE_SYSTEM_PROMPT,
  INTERVIEW_GUIDE_TOOL,
  LEAN_CANVAS_SYSTEM_PROMPT,
  LEAN_CANVAS_TOOL,
  MARKET_SCAN_SYSTEM_PROMPT,
  MARKET_SCAN_TOOL,
  VALUE_PROPOSITION_SYSTEM_PROMPT,
  VALUE_PROPOSITION_TOOL,
} from "@/lib/prompts/ideaFill";

const MODEL = "claude-sonnet-4-6";
// Each fill call gets a hard ceiling (the SDK default is 10 minutes with
// retries) so a stuck request fails the section instead of leaving the
// overview page "writing" forever.
const REQUEST_OPTIONS = { timeout: 90_000, maxRetries: 1 };

// ─── Fill status (drives the overview page's placeholders) ──────────────────

export const FILL_SECTIONS = ["about", "leanCanvas", "valueProposition", "marketScan", "interviewGuide"] as const;
export type FillSection = (typeof FILL_SECTIONS)[number];
export type FillState = "pending" | "running" | "done" | "failed" | "skipped";
export type FillStatus = Partial<Record<FillSection, FillState>>;

const FILL_STATES: readonly string[] = ["pending", "running", "done", "failed", "skipped"];

export function parseFillStatus(raw: unknown): FillStatus {
  const o = (raw ?? {}) as Record<string, unknown>;
  const out: FillStatus = {};
  for (const s of FILL_SECTIONS) if (typeof o[s] === "string" && FILL_STATES.includes(o[s] as string)) out[s] = o[s] as FillState;
  return out;
}

// A section still "running" long after the last update was cut short (the
// server restarted mid-fill, or a request hung) — show it as failed so the
// page stops waiting and offers a retry.
const STALE_AFTER_MS = 5 * 60_000;
export function withStaleAsFailed(status: FillStatus, updatedAt: Date, now = Date.now()): FillStatus {
  if (now - updatedAt.getTime() < STALE_AFTER_MS) return status;
  const out: FillStatus = { ...status };
  for (const s of FILL_SECTIONS) if (out[s] === "pending" || out[s] === "running") out[s] = "failed";
  return out;
}

export function isFillInProgress(status: FillStatus): boolean {
  return Object.values(status).some((s) => s === "pending" || s === "running");
}

// Atomic per-key update — the sections run in parallel, so a
// read-modify-write of the whole JSON would lose updates.
async function setFillState(dreamId: string, section: FillSection, state: FillState) {
  await prisma.$executeRaw`
    UPDATE "DreamConversation"
    SET "fillStatus" = COALESCE("fillStatus", '{}'::jsonb) || jsonb_build_object(${section}::text, ${state}::text),
        "updatedAt" = NOW()
    WHERE id = ${dreamId}`;
}

// ─── Pure parsing (unit tested) ─────────────────────────────────────────────

export type Basis = "user" | "inferred";
export type ProposedField = { value: string; basis: Basis };

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function proposed(v: unknown): ProposedField {
  const o = (v ?? {}) as Record<string, unknown>;
  return { value: str(o.value), basis: o.basis === "user" ? "user" : "inferred" };
}

export function statusFor(basis: Basis): FieldKnowledgeStatus {
  // What the initiativtagare said themselves is known; anything the AI
  // derived is an assumption until someone confirms it.
  return basis === "user" ? "VET" : "ANTAR";
}

export type Basics = {
  title: ProposedField;
  summary: ProposedField;
  description: ProposedField;
  category: string;
  tags: string[];
  sdgGoals: number[];
  conditions: { weeklyHours: number | null; teamMode: TeamMode | null; ambition: ProjectAmbition | null };
  openQuestions: string[];
};

// The hard rules are enforced here, not trusted to the prompt: at most 3
// SDGs, a known category, sane hours.
export function coerceBasics(raw: unknown): Basics {
  const o = (raw ?? {}) as Record<string, unknown>;
  const hours = typeof o.weekly_hours === "number" && Number.isFinite(o.weekly_hours) ? Math.round(o.weekly_hours) : null;
  return {
    title: proposed(o.title),
    summary: proposed(o.summary),
    description: proposed(o.description),
    category: CATEGORIES.includes(str(o.category)) ? str(o.category) : "",
    tags: Array.isArray(o.tags) ? o.tags.map(str).filter(Boolean).slice(0, 8) : [],
    sdgGoals: Array.isArray(o.sdg_goals)
      ? [...new Set(o.sdg_goals.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 17))].slice(0, 3)
      : [],
    conditions: {
      weeklyHours: hours !== null && hours >= 0 && hours <= 80 ? hours : null,
      teamMode: o.team_mode === "SOLO" || o.team_mode === "SMALL" || o.team_mode === "TEAM" ? o.team_mode : null,
      ambition: o.ambition === "HOBBY" || o.ambition === "VENTURE" ? o.ambition : null,
    },
    openQuestions: Array.isArray(o.open_questions) ? [...new Set(o.open_questions.map(str).filter(Boolean))].slice(0, 20) : [],
  };
}

// Only known fields with content — an empty proposal is never written.
export function coerceProposals(raw: unknown, fields: readonly string[]): Record<string, ProposedField> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const out: Record<string, ProposedField> = {};
  for (const f of fields) {
    const p = proposed(o[f]);
    if (p.value) out[f] = p;
  }
  return out;
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();
}

// Every URL that actually came back from a web search in this response.
export function searchResultUrls(content: Anthropic.ContentBlock[]): Set<string> {
  const urls = new Set<string>();
  for (const block of content) {
    if (block.type !== "web_search_tool_result" || !Array.isArray(block.content)) continue;
    for (const r of block.content) if (r.type === "web_search_result" && r.url) urls.add(normalizeUrl(r.url));
  }
  return urls;
}

export type MarketScanProposal = {
  type: MarketScanEntryType;
  name: string;
  description: string;
  relevance: string;
  sourceUrl: string;
};

const SCAN_TYPES: readonly string[] = ["COMPETITOR", "PARTNER_PROSPECT", "TREND", "REGULATION"];

// "AI never makes up facts": an entry is kept only if its source is a page
// that really appeared in the search results — anything else is dropped.
export function coerceMarketScan(raw: unknown, allowedUrls: Set<string>): MarketScanProposal[] {
  const entries = Array.isArray((raw as { entries?: unknown })?.entries) ? (raw as { entries: unknown[] }).entries : [];
  const out: MarketScanProposal[] = [];
  for (const e of entries) {
    const o = (e ?? {}) as Record<string, unknown>;
    const sourceUrl = str(o.source_url);
    if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl) || !allowedUrls.has(normalizeUrl(sourceUrl))) continue;
    if (!str(o.name) || !str(o.description)) continue;
    out.push({
      type: (SCAN_TYPES.includes(str(o.type)) ? str(o.type) : "COMPETITOR") as MarketScanEntryType,
      name: str(o.name).slice(0, 200),
      description: str(o.description),
      relevance: str(o.relevance),
      sourceUrl,
    });
  }
  return out.slice(0, 8);
}

// The model sometimes writes markdown (**bold**) inside plain strings;
// escaped as-is it shows up as literal asterisks. Escape first, then turn
// **x** into <strong>.
function inline(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*\*/g, "");
}

export function interviewGuideHtml(raw: unknown): string | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const questions = Array.isArray(o.questions) ? o.questions.map(str).filter(Boolean) : [];
  if (questions.length < 3) return null;
  const tips = Array.isArray(o.tips) ? o.tips.map(str).filter(Boolean) : [];
  const parts = [
    `<p><em>Framtagen av AI:n som ett utkast — ändra fritt.</em></p>`,
    str(o.purpose) ? `<h2>Syfte</h2><p>${inline(str(o.purpose))}</p>` : "",
    str(o.who) ? `<h2>Vilka du bör intervjua</h2><p>${inline(str(o.who))}</p>` : "",
    `<h2>Frågor</h2><ol>${questions.map((q) => `<li>${inline(q)}</li>`).join("")}</ol>`,
    tips.length ? `<h2>Tips</h2><ul>${tips.map((t) => `<li>${inline(t)}</li>`).join("")}</ul>` : "",
  ];
  return parts.filter(Boolean).join("");
}

// ─── Model calls ────────────────────────────────────────────────────────────

export async function buildTranscript(roomId: string): Promise<string> {
  const history = await prisma.message.findMany({
    where: { roomId, hiddenAt: null },
    orderBy: { createdAt: "asc" },
    select: { isAi: true, body: true },
  });
  return history
    .map((m) => `${m.isAi ? "Idécoachen" : "Initiativtagaren"}: ${m.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}`)
    .join("\n");
}

async function callTool(
  client: Anthropic,
  params: { system: string; tool: Anthropic.Tool; content: string; maxTokens?: number },
): Promise<unknown> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 4000,
    system: params.system,
    tools: [params.tool],
    tool_choice: { type: "tool", name: params.tool.name },
    messages: [{ role: "user", content: params.content }],
  }, REQUEST_OPTIONS);
  const toolUse = response.content.find((b) => b.type === "tool_use");
  return toolUse && toolUse.type === "tool_use" ? toolUse.input : null;
}

export async function generateBasics(client: Anthropic, transcript: string): Promise<Basics> {
  const raw = await callTool(client, { system: BASICS_SYSTEM_PROMPT, tool: BASICS_TOOL, content: `Här är samtalet:\n\n${transcript}` });
  return coerceBasics(raw);
}

// Web search + a report tool in one call. Not forced (forcing the report
// tool would skip the searching); the model searches, then reports. A
// long search can come back as pause_turn — continue it a few times.
async function researchMarket(client: Anthropic, context: string): Promise<MarketScanProposal[]> {
  // The basic web search variant: the dynamic-filtering one (_20260209)
  // runs code between searches and regularly took over two minutes here;
  // three plain searches are enough for a first scan.
  const tools: Anthropic.ToolUnion[] = [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }, MARKET_SCAN_TOOL];
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: context }];
  const allContent: Anthropic.ContentBlock[] = [];
  for (let i = 0; i < 2; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: MARKET_SCAN_SYSTEM_PROMPT,
      tools,
      messages,
    }, { timeout: 240_000, maxRetries: 0 });
    allContent.push(...response.content);
    const report = response.content.find((b) => b.type === "tool_use" && b.name === MARKET_SCAN_TOOL.name);
    if (report && report.type === "tool_use") return coerceMarketScan(report.input, searchResultUrls(allContent));
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content });
  }
  return [];
}

// ─── Applying proposals (the never-overwrite rule) ──────────────────────────

type CanvasEntity = "leanCanvas" | "valueProposition";

// Writes (as AI drafts) what AI may write and turns the rest into
// suggestions next to the field — see decideAiPlacement.
async function applyCanvas(
  projectId: string,
  projectSlug: string,
  entity: CanvasEntity,
  proposals: Record<string, ProposedField>,
  mode: AiMode,
): Promise<{ written: number }> {
  const [row, provenance] = await Promise.all([
    entity === "leanCanvas"
      ? prisma.leanCanvas.findUnique({ where: { projectSlug } })
      : prisma.valueProposition.findUnique({ where: { projectSlug } }),
    getFieldProvenance(projectId, entity),
  ]);
  const current = (row ?? {}) as Record<string, unknown>;
  const writes: [string, ProposedField][] = [];
  const suggestions: [string, ProposedField][] = [];
  for (const [field, p] of Object.entries(proposals)) {
    if (decideAiPlacement(mode, current[field] as string | null, provenance[field]) === "write") writes.push([field, p]);
    else suggestions.push([field, p]);
  }

  await prisma.$transaction(async (tx) => {
    if (writes.length) {
      const data = Object.fromEntries(writes.map(([f, p]) => [f, p.value]));
      const fields: readonly string[] = entity === "leanCanvas" ? LEAN_CANVAS_FIELDS : VALUE_PROPOSITION_FIELDS;
      if (entity === "leanCanvas") {
        const canvas = await tx.leanCanvas.upsert({ where: { projectSlug }, create: { projectSlug, ...data }, update: data });
        await tx.leanCanvasVersion.create({ data: { projectSlug, ...Object.fromEntries(fields.map((f) => [f, (canvas as Record<string, unknown>)[f]])) } });
      } else {
        const canvas = await tx.valueProposition.upsert({ where: { projectSlug }, create: { projectSlug, ...data }, update: data });
        await tx.valuePropositionVersion.create({ data: { projectSlug, ...Object.fromEntries(fields.map((f) => [f, (canvas as Record<string, unknown>)[f]])) } });
      }
      for (const [field, p] of writes) await recordAiWrite(tx, { projectId, entity, field, status: statusFor(p.basis) });
    }
    for (const [field, p] of suggestions) await createAiSuggestion(tx, { projectId, entity, field, content: p.value });
  });
  return { written: writes.length };
}

async function markDone(projectId: string, itemKey: string, userId: string) {
  await prisma.initiativeChecklistItem.upsert({
    where: { projectId_itemKey: { projectId, itemKey } },
    create: { projectId, phase: "IDEA", itemKey, completedAt: new Date(), completedById: userId },
    update: { completedAt: new Date(), completedById: userId },
  });
}

// ─── The background fill ────────────────────────────────────────────────────

export type IdeaFillParams = {
  dreamId: string;
  projectId: string;
  projectSlug: string;
  mode: AiMode;
  transcript: string;
  // The initiativtagare — checklist items are ticked in their name.
  userId: string;
  // Retry: run only these sections (default: all four).
  only?: FillSection[];
};

// Runs after the project exists, in the background (fire-and-forget from
// the server action — this app is a persistent Node server). Each section
// is independent: one failing leaves the others, and the overview page
// shows it as failed with a way to do it by hand. AGENT fills everything
// AI can do in phase 1; ASSIST only produces suggestions next to the canvas
// fields and leaves research and the interview guide to the human.
// Not rate-limited per user: it's a single bounded batch per project
// (the conversation itself was rate-limited).
export async function runIdeaFill(p: IdeaFillParams): Promise<void> {
  const gate = await getAiClientFor({ feature: "dream-conversation", kind: "assist", userId: null, projectId: null });
  const sections: FillSection[] = p.only ?? ["leanCanvas", "valueProposition", "marketScan", "interviewGuide"];
  const wanted = (section: FillSection) => sections.includes(section);
  if (!gate.ok) {
    await Promise.all(sections.map((s) => setFillState(p.dreamId, s, "failed")));
    return;
  }
  const client = gate.client;
  const project = await prisma.project.findUnique({ where: { id: p.projectId }, select: { title: true, summary: true, description: true } });
  const context =
    `Projekt: ${project?.title ?? ""}\nSammanfattning: ${project?.summary ?? ""}\nBeskrivning: ${(project?.description ?? "").replace(/<[^>]*>/g, " ")}\n\n` +
    `Drömsamtalet:\n${p.transcript}`;
  const agent = p.mode === "AGENT";

  const run = async (section: FillSection, work: () => Promise<void>) => {
    await setFillState(p.dreamId, section, "running");
    try {
      await work();
      await setFillState(p.dreamId, section, "done");
    } catch (err) {
      logger.error("idea-fill: section failed", { section, projectId: p.projectId, err: String(err) });
      await setFillState(p.dreamId, section, "failed");
    }
  };

  const aiUser = await getAiParticipantUser();

  await Promise.all([
    !wanted("leanCanvas") ? null : run("leanCanvas", async () => {
      const raw = await callTool(client, { system: LEAN_CANVAS_SYSTEM_PROMPT, tool: LEAN_CANVAS_TOOL, content: context });
      const { written } = await applyCanvas(p.projectId, p.projectSlug, "leanCanvas", coerceProposals(raw, LEAN_CANVAS_FIELDS), p.mode);
      if (written) await markDone(p.projectId, "lean_canvas_created", p.userId);
    }),
    !wanted("valueProposition") ? null : run("valueProposition", async () => {
      const raw = await callTool(client, { system: VALUE_PROPOSITION_SYSTEM_PROMPT, tool: VALUE_PROPOSITION_TOOL, content: context });
      const { written } = await applyCanvas(p.projectId, p.projectSlug, "valueProposition", coerceProposals(raw, VALUE_PROPOSITION_FIELDS), p.mode);
      if (written) await markDone(p.projectId, "value_proposition_created", p.userId);
    }),
    !wanted("marketScan") ? null : agent
      ? run("marketScan", async () => {
          const entries = await researchMarket(client, context);
          if (entries.length) {
            await prisma.marketScanEntry.createMany({
              data: entries.map((e) => ({
                projectSlug: p.projectSlug,
                type: e.type,
                name: e.name,
                description: e.description,
                relevanceNote: e.relevance || null,
                sourceUrl: e.sourceUrl,
                createdByAi: true,
                createdById: aiUser.id,
              })),
            });
            await markDone(p.projectId, "market_scan_partners", p.userId);
          }
        })
      : setFillState(p.dreamId, "marketScan", "skipped"),
    !wanted("interviewGuide") ? null : agent
      ? run("interviewGuide", async () => {
          const exists = await prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: p.projectSlug, slug: "intervjuguide" } } });
          if (exists) return;
          const html = interviewGuideHtml(await callTool(client, { system: INTERVIEW_GUIDE_SYSTEM_PROMPT, tool: INTERVIEW_GUIDE_TOOL, content: context }));
          if (!html) throw new Error("no interview guide");
          const maxOrder = await prisma.wikiPage.aggregate({ where: { projectSlug: p.projectSlug }, _max: { order: true } });
          await prisma.wikiPage.create({
            data: {
              projectSlug: p.projectSlug,
              slug: "intervjuguide",
              title: "Intervjuguide",
              content: html,
              order: (maxOrder._max.order ?? -1) + 1,
              createdById: aiUser.id,
            },
          });
        })
      : setFillState(p.dreamId, "interviewGuide", "skipped"),
  ]);
}
