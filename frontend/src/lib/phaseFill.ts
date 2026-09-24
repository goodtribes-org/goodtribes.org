import type Anthropic from "@anthropic-ai/sdk";
import type { Prisma, ProjectPhase } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getAiClientFor } from "@/lib/aiMode";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { escapeHtml } from "@/lib/renderBody";
import { draftText, type DraftText } from "@/lib/aiLanguage";

// Shared status handling for the AI's background drafting on a phase's
// one-page overview (Uppstart, Lansering, …), stored in PhaseFill as
// { <section>: "pending" | "running" | "done" | "failed" | "skipped" }.

export type PhaseFillState = "pending" | "running" | "done" | "failed" | "skipped";

const STATES: readonly string[] = ["pending", "running", "done", "failed", "skipped"];
const STALE_AFTER_MS = 5 * 60_000;

// A section still waiting long after the last update was cut short
// (restart, hung request) and shows as failed so the page stops waiting
// and offers a retry — same rule as the Idé fill.
export function parsePhaseFillStatus<S extends string>(
  raw: unknown,
  sections: readonly S[],
  updatedAt?: Date,
  now = Date.now(),
): Partial<Record<S, PhaseFillState>> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const stale = updatedAt ? now - updatedAt.getTime() >= STALE_AFTER_MS : false;
  const out: Partial<Record<S, PhaseFillState>> = {};
  for (const s of sections) {
    const v = o[s];
    if (typeof v !== "string" || !STATES.includes(v)) continue;
    out[s] = stale && (v === "pending" || v === "running") ? "failed" : (v as PhaseFillState);
  }
  return out;
}

export function isPhaseFillInProgress(status: Partial<Record<string, PhaseFillState>>): boolean {
  return Object.values(status).some((s) => s === "pending" || s === "running");
}

// Atomic per-key update — sections run in parallel.
export async function setPhaseFillState(projectId: string, phase: ProjectPhase, section: string, state: PhaseFillState) {
  await prisma.$executeRaw`
    UPDATE "PhaseFill"
    SET "status" = "status" || jsonb_build_object(${section}::text, ${state}::text), "updatedAt" = NOW()
    WHERE "projectId" = ${projectId} AND "phase" = ${phase}::"ProjectPhase"`;
}

// Marks the given sections pending (keeping the others' state).
export async function markPhaseFillPending(projectId: string, phase: ProjectPhase, sections: readonly string[]) {
  const pending = Object.fromEntries(sections.map((s) => [s, "pending"])) as Prisma.InputJsonObject;
  const existing = await prisma.phaseFill.findUnique({ where: { projectId_phase: { projectId, phase } } });
  await prisma.phaseFill.upsert({
    where: { projectId_phase: { projectId, phase } },
    create: { projectId, phase, status: pending },
    update: { status: { ...((existing?.status as Prisma.JsonObject | null) ?? {}), ...pending } },
  });
}

// ─── Shared building blocks for the phase fills ─────────────────────────────

const MODEL = "claude-sonnet-4-6";

export function fillStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
export function fillList(v: unknown, max: number): string[] {
  return Array.isArray(v) ? v.map(fillStr).filter(Boolean).slice(0, max) : [];
}
export function htmlList(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
}
// A wiki page from titled lists/paragraphs — every value escaped.
export function wikiHtml(sections: { heading: string; text?: string; items?: string[] }[], note: string): string {
  return [
    ...sections
      .filter((s) => s.text || s.items?.length)
      .map((s) => `<h2>${escapeHtml(s.heading)}</h2>${s.text ? `<p>${escapeHtml(s.text)}</p>` : ""}${s.items?.length ? htmlList(s.items) : ""}`),
    `<p><em>${escapeHtml(note)}</em></p>`,
  ].join("\n");
}

// Never overwrite: only the empty text fields get the draft.
export function emptyFieldsToWrite<F extends string>(
  fields: readonly F[],
  current: Partial<Record<F, string | null>> | null,
  draft: Partial<Record<F, string>>,
): Partial<Record<F, string>> {
  const out: Partial<Record<F, string>> = {};
  for (const f of fields) if (draft[f] && !current?.[f]?.trim()) out[f] = draft[f];
  return out;
}

export async function callFillTool(client: Anthropic, system: string, tool: Anthropic.Tool, content: string): Promise<unknown> {
  const response = await client.messages.create(
    { model: MODEL, max_tokens: 3000, system, tools: [tool], tool_choice: { type: "tool", name: tool.name }, messages: [{ role: "user", content }] },
    { timeout: 90_000, maxRetries: 1 },
  );
  const toolUse = response.content.find((b) => b.type === "tool_use");
  return toolUse && toolUse.type === "tool_use" ? toolUse.input : null;
}

export async function wikiPageExists(projectSlug: string, slug: string): Promise<boolean> {
  return !!(await prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug, slug } }, select: { id: true } }));
}

export async function createWikiPage(projectSlug: string, slug: string, title: string, content: string, authorId: string) {
  const maxOrder = await prisma.wikiPage.aggregate({ where: { projectSlug }, _max: { order: true } });
  await prisma.wikiPage.create({ data: { projectSlug, slug, title, content, order: (maxOrder._max.order ?? -1) + 1, createdById: authorId } });
}

export async function markStepDone(projectId: string, phase: ProjectPhase, itemKey: string, userId: string) {
  await prisma.initiativeChecklistItem.upsert({
    where: { projectId_itemKey: { projectId, itemKey } },
    create: { projectId, phase, itemKey, completedAt: new Date(), completedById: userId },
    update: { completedAt: new Date(), completedById: userId },
  });
}

export async function addAiCards(projectSlug: string, cards: { title: string; description: string }[], authorId: string) {
  if (!cards.length) return;
  const maxOrder = await prisma.kanbanCard.aggregate({ where: { projectSlug, column: "TODO" }, _max: { order: true } });
  const start = (maxOrder._max.order ?? -1) + 1;
  await prisma.kanbanCard.createMany({
    data: cards.map((c, i) => ({ projectSlug, title: c.title, description: c.description || null, column: "TODO", order: start + i, createdById: authorId, createdByAi: true })),
  });
}

// t = the fixed draft text (headings, titles) in the project's language.
export type PhaseFillWork = (ctx: { client: Anthropic; context: string; aiUserId: string; t: DraftText }) => Promise<void>;

// Runs a phase's sections in parallel: each one marks itself running, then
// done or failed (logged) — one failing never stops the others. Gated by
// the project's AI mode and monthly budget (asked for by a person).
export async function runPhaseFill<S extends string>(p: {
  projectId: string;
  phase: ProjectPhase;
  sections: readonly S[];
  buildContext: () => Promise<string>;
  work: Record<S, PhaseFillWork>;
}): Promise<void> {
  const gate = await getAiClientFor({ feature: "project-plan", kind: "assist", userId: null, projectId: p.projectId, phase: p.phase, language: "project" });
  if (!gate.ok) {
    await Promise.all(p.sections.map((s) => setPhaseFillState(p.projectId, p.phase, s, "failed")));
    return;
  }
  const [context, aiUser, lang] = await Promise.all([
    p.buildContext(),
    getAiParticipantUser(),
    prisma.project.findUnique({ where: { id: p.projectId }, select: { contentLocale: true } }),
  ]);
  const t = draftText(lang?.contentLocale);
  await Promise.all(
    p.sections.map(async (section) => {
      await setPhaseFillState(p.projectId, p.phase, section, "running");
      try {
        await p.work[section]({ client: gate.client, context, aiUserId: aiUser.id, t });
        await setPhaseFillState(p.projectId, p.phase, section, "done");
      } catch (err) {
        logger.error("phase-fill: section failed", { phase: p.phase, section, projectId: p.projectId, err: String(err) });
        await setPhaseFillState(p.projectId, p.phase, section, "failed");
      }
    }),
  );
}

// Marks the sections pending and runs them in the background.
export async function startPhaseFill<S extends string>(p: Parameters<typeof runPhaseFill<S>>[0]): Promise<void> {
  await markPhaseFillPending(p.projectId, p.phase, p.sections);
  void runPhaseFill(p).catch((err) => logger.error("phase-fill: crashed", { phase: p.phase, projectId: p.projectId, err: String(err) }));
}
