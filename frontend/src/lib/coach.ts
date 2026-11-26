import type { CoachLevel } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { isAiEnabled } from "@/lib/anthropic";
import { getAiClientFor } from "@/lib/aiMode";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getYourTribe } from "@/lib/yourTribe";
import { wrapUntrusted } from "@/lib/untrusted";
import { logger } from "@/lib/logger";
import { coachSystemPrompt, COACH_TOOL } from "@/lib/prompts/coach";

// Coachen (#367): a personal coach that coaches a person, not a project. It
// lives first in the conversation panel (components/ConversationsPanel.tsx).
// Behind the `coach` flag and only when AI is configured; each person sets
// how hard it pushes (User.coachLevel) or turns it off. Every reply is one
// forced-tool call through getAiClientFor, charged to the person's own coach
// budget. It only ever writes its own messages and promises — it never acts
// in a project or sends anything.

const MODEL = "claude-sonnet-4-6";
const REQUEST_OPTIONS = { timeout: 60_000, maxRetries: 1 };
const HISTORY = 20;
// The coach opens the conversation itself when you come back after this long.
const OPENING_AFTER_MS = 12 * 60 * 60 * 1000;
const MAX_QUICK_REPLIES = 3;
const MAX_TEXT = 2000;

export type CoachMessageView = { id: string; role: "COACH" | "USER"; body: string; quickReplies: string[]; draft: string | null; createdAt: string };
export type CoachState = { available: boolean; level: CoachLevel; messages: CoachMessageView[] };

export async function isCoachAvailable(userId: string): Promise<boolean> {
  return isAiEnabled() && (await isFeatureEnabled("coach", userId));
}

function view(m: { id: string; role: "COACH" | "USER"; body: string; quickReplies: string[]; draft: string | null; createdAt: Date }): CoachMessageView {
  return { id: m.id, role: m.role, body: m.body, quickReplies: m.quickReplies, draft: m.draft, createdAt: m.createdAt.toISOString() };
}

async function recent(userId: string) {
  const rows = await prisma.coachMessage.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: HISTORY });
  return rows.reverse();
}

export async function getCoachState(userId: string): Promise<CoachState> {
  const [available, user] = await Promise.all([
    isCoachAvailable(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { coachLevel: true } }),
  ]);
  const level = user?.coachLevel ?? "CALM";
  if (!available || level === "OFF") return { available, level, messages: [] };
  return { available, level, messages: (await recent(userId)).map(view) };
}

// What the coach knows: your projects and how they move, what's waiting for
// you, and the promises you've made. Project titles and tasks are written by
// many people, so they go in as material, never as instructions.
async function context(userId: string, now: number, locale: string): Promise<string> {
  const [user, tribe, promises, tStep] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    getYourTribe(userId, now, { lastEvents: false }),
    prisma.coachPromise.findMany({ where: { userId, doneAt: null }, orderBy: { createdAt: "desc" }, take: 10 }),
    getTranslations({ locale, namespace: "ProjectPhaseChecklist" }),
  ]);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const projects = tribe.pulse.slice(0, 8).map((p) => `- ${p.title} (${p.isLead ? "leder" : "medlem"}, fas ${p.phase}, ${p.status === "moving" ? "i rörelse" : p.status === "slowing" ? "saktar in" : "står still"})`);
  const todos = tribe.todos.slice(0, 8).map((t) =>
    t.kind === "task" ? `- Uppgift: ${t.title} (${t.project}${t.due ? `, senast ${day(t.due)}${t.overdue ? ", försenad" : ""}` : ""})`
    : t.kind === "nextStep" ? `- Nästa steg i ${t.project}: ${tStep.has(t.step) ? tStep(t.step) : t.step}`
    : t.kind === "joinRequest" ? `- ${t.name ?? "Någon"} vill gå med i ${t.project}`
    : t.kind === "draft" ? `- ${t.project} är ett opublicerat utkast sedan ${t.days} dagar`
    : `- Impactpuls väntar i ${t.project}`,
  );
  const material = [
    `Projekt:\n${projects.join("\n") || "- (inga projekt än)"}`,
    `Att göra (${tribe.todoTotal} totalt):\n${todos.join("\n") || "- (inget)"}`,
  ].join("\n\n");
  const open = promises.map((p) => `- [${p.id}] ${p.text} (lovat ${day(p.createdAt)}${p.dueAt ? `, till ${day(p.dueAt)}` : ""})`);
  return [
    `I dag: ${day(new Date(now))}. Personen heter ${user?.name?.split(" ")[0] ?? "(okänt)"}.`,
    wrapUntrusted("personens projekt och att göra", material),
    `Öppna löften:\n${open.join("\n") || "- (inga)"}`,
  ].join("\n\n");
}

type Reply = { message: string; quickReplies: string[]; draft: string | null; promise: { text: string; dueInDays?: number } | null; done: string[] };

// Exported for its unit test (coach.test.ts).
export function parseCoachReply(input: unknown): Reply | null {
  const o = (input ?? {}) as Record<string, unknown>;
  const message = typeof o.message === "string" ? o.message.trim() : "";
  if (!message) return null;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const np = (o.new_promise ?? null) as Record<string, unknown> | null;
  return {
    message: message.slice(0, MAX_TEXT),
    quickReplies: (Array.isArray(o.quick_replies) ? o.quick_replies.map(str).filter(Boolean) : []).slice(0, MAX_QUICK_REPLIES).map((q) => q.slice(0, 40)),
    draft: str(o.draft).slice(0, MAX_TEXT) || null,
    promise: np && str(np.text) ? { text: str(np.text).slice(0, 300), dueInDays: typeof np.due_in_days === "number" ? np.due_in_days : undefined } : null,
    done: Array.isArray(o.done_promise_ids) ? o.done_promise_ids.map(str).filter(Boolean) : [],
  };
}

export type CoachTurnResult = { ok: true; state: CoachState } | { ok: false; reason: "unavailable" | "off" | "rate_limited" | "budget_exceeded" | "failed" };

// One turn: the person said something (text), or opened the panel and the
// coach takes the initiative (text = null, only if it's been a while).
export async function coachTurn(userId: string, text: string | null, locale: string): Promise<CoachTurnResult> {
  if (!(await isCoachAvailable(userId))) return { ok: false, reason: "unavailable" };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { coachLevel: true } });
  const level = user?.coachLevel ?? "CALM";
  if (level === "OFF") return { ok: false, reason: "off" };

  const now = Date.now();
  if (text === null) {
    // Initiative only when you come back after a while — never a new opener
    // on every open, and never on top of an unanswered coach message from today.
    const last = await prisma.coachMessage.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    if (last && now - last.createdAt.getTime() < OPENING_AFTER_MS) return { ok: true, state: await getCoachState(userId) };
  } else {
    const body = text.trim().slice(0, MAX_TEXT);
    if (!body) return { ok: true, state: await getCoachState(userId) };
    await prisma.coachMessage.create({ data: { userId, role: "USER", body } });
  }

  const gate = await getAiClientFor({ feature: "coach", kind: "assist", userId, projectId: null, coachBudgetUserId: userId });
  if (!gate.ok) {
    return { ok: false, reason: gate.reason === "rate_limited" ? "rate_limited" : gate.reason === "budget_exceeded" ? "budget_exceeded" : "unavailable" };
  }

  const history = await recent(userId);
  // The model needs a user turn to answer; when the coach opens, that turn is
  // the situation itself.
  // Consecutive messages from the same side (two openers in a row) are joined,
  // so the roles always alternate.
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of history) {
    const role = m.role === "COACH" ? ("assistant" as const) : ("user" as const);
    const prev = messages[messages.length - 1];
    if (prev && prev.role === role) prev.content = `${prev.content}\n\n${m.body}`;
    else messages.push({ role, content: m.body });
  }
  const situation = `${await context(userId, now, locale)}\n\n${text === null ? "Personen har just öppnat GoodTribes. Ta initiativet." : "Svara på personens senaste meddelande."}`;
  // Merge into one user message at the end (the API wants alternating roles).
  if (messages.length && messages[messages.length - 1].role === "user") {
    messages[messages.length - 1] = { role: "user", content: `${situation}\n\nPersonen skrev: ${messages[messages.length - 1].content}` };
  } else {
    messages.push({ role: "user", content: situation });
  }
  // The conversation must start with a user turn: when the coach spoke
  // first (it opened), keep its words and put a stand-in before them.
  if (messages[0]?.role === "assistant") messages.unshift({ role: "user", content: "(Personen öppnade GoodTribes.)" });

  let reply: Reply | null = null;
  try {
    const response = await gate.client.messages.create(
      {
        model: MODEL,
        max_tokens: 800,
        system: coachSystemPrompt(level, locale),
        tools: [COACH_TOOL],
        tool_choice: { type: "tool", name: COACH_TOOL.name },
        messages,
      },
      REQUEST_OPTIONS,
    );
    const toolUse = response.content.find((b) => b.type === "tool_use");
    reply = toolUse && toolUse.type === "tool_use" ? parseCoachReply(toolUse.input) : null;
  } catch (err) {
    logger.error("coach reply failed", { userId, error: err instanceof Error ? err.message : String(err) });
  }
  if (!reply) return { ok: false, reason: "failed" };

  const { promise, done } = reply;
  await prisma.$transaction([
    prisma.coachMessage.create({ data: { userId, role: "COACH", body: reply.message, quickReplies: reply.quickReplies, draft: reply.draft } }),
    ...(promise
      ? [prisma.coachPromise.create({ data: { userId, text: promise.text, dueAt: promise.dueInDays ? new Date(now + promise.dueInDays * 86_400_000) : null } })]
      : []),
    // Only your own promises can be closed, whatever ids come back.
    ...(done.length ? [prisma.coachPromise.updateMany({ where: { userId, id: { in: done }, doneAt: null }, data: { doneAt: new Date(now) } })] : []),
  ]);
  return { ok: true, state: await getCoachState(userId) };
}

export async function setCoachLevel(userId: string, level: CoachLevel): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { coachLevel: level } });
}
