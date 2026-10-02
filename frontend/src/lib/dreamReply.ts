import type { Room } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAiClientFor } from "@/lib/aiMode";
import { withCacheBreakpoint } from "@/lib/anthropic";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { persistAiMessage } from "@/lib/aiThreadReply";
import { escapeHtml } from "@/lib/renderBody";
import { logger } from "@/lib/logger";
import { mergeDreamState, parseDreamState, parseOpenQuestions } from "@/lib/dreamConversation";
import { DREAM_REPLY_TOOL, DREAM_SYSTEM_PROMPT, dreamProgressNote } from "@/lib/prompts/dreamConversation";
import { htmlToText } from "@/lib/htmlToText";
import { publishToRoom } from "@/lib/redis";

// The room's typing indicator expires after 4 s, so repeat it while the
// model works. The AI's own message clears it, like any author's.
const AI_TYPING_INTERVAL_MS = 3000;


export function dreamConversationUrl(roomId: string): string {
  return `/projects/new/samtal/${roomId}`;
}

// Plain paragraphs, escaped — the model writes plain text with blank lines.
function toHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// Answers the latest user message in a Drömsamtal and updates its structured
// state (covered areas, notes, open questions) from the same model call.
// Fire-and-forget from sendRoomMessage, like triggerAiThreadReply.
export async function triggerDreamReply(room: Room, triggeredByUserId: string): Promise<void> {
  const aiUser = await getAiParticipantUser();
  const showTyping = () => publishToRoom(room.id, { type: "typing", userId: aiUser.id, name: aiUser.name ?? "AI" });
  showTyping();
  const typing = setInterval(showTyping, AI_TYPING_INTERVAL_MS);

  try {
    const dream = await prisma.dreamConversation.findUnique({ where: { roomId: room.id } });
    if (!dream || dream.status !== "in_progress") return;

    // No project exists yet — only AI configuration and the rate limit apply.
    const gate = await getAiClientFor({
      feature: "dream-conversation",
      kind: "assist",
      userId: triggeredByUserId,
      projectId: null,
    });
    if (!gate.ok) {
      const text =
        gate.reason === "rate_limited"
          ? "Jag behöver en kort paus — försök igen om en stund."
          : "AI är inte tillgänglig just nu. Du kan pausa och fortsätta senare, eller fylla i guiden själv.";
      await persistAiMessage(room.id, `<p>${text}</p>`, aiUser.id);
      return;
    }

    const history = await prisma.message.findMany({
      where: { roomId: room.id, hiddenAt: null },
      orderBy: { createdAt: "asc" },
      select: { isAi: true, body: true },
    });
    // The conversation must start with a user turn, but a Drömsamtal starts
    // with the coach's opener — keep the opener (the model needs to know what
    // it asked) behind a neutral first user turn.
    const turns = history.map((m) => ({ role: (m.isAi ? "assistant" : "user") as "assistant" | "user", content: htmlToText(m.body) }));
    if (turns[0]?.role === "assistant") turns.unshift({ role: "user", content: "(Personen öppnade Drömsamtalet.)" });
    if (turns[turns.length - 1]?.role !== "user") return;

    const previous = parseDreamState(dream.state);
    const openQuestions = parseOpenQuestions(dream.openQuestions);
    const progressNote = dreamProgressNote({
      covered: previous.covered,
      notes: previous.notes,
      openQuestions,
      aiQuestionCount: history.filter((m) => m.isAi).length,
    });

    const response = await gate.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      // DREAM_SYSTEM_PROMPT is fixed and cached; progressNote changes every
      // turn (covered/notes/open questions), so it stays a separate,
      // uncached block — caching it would just churn the cache for no
      // benefit. Same reasoning as aiThreadReply.ts's cache_control use.
      system: [
        { type: "text", text: DREAM_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: progressNote },
      ],
      tools: [DREAM_REPLY_TOOL],
      tool_choice: { type: "tool", name: DREAM_REPLY_TOOL.name },
      messages: withCacheBreakpoint(turns),
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    const input = (toolUse && toolUse.type === "tool_use" ? toolUse.input : {}) as Record<string, unknown>;
    const reply = typeof input.reply === "string" ? input.reply.trim() : "";
    if (!reply) throw new Error("empty dream reply");

    const next = mergeDreamState(previous, parseDreamState({ covered: input.covered, notes: input.notes, done: input.done }));
    await prisma.dreamConversation.update({
      where: { id: dream.id },
      data: { state: next, openQuestions: parseOpenQuestions(input.open_questions) },
    });
    await persistAiMessage(room.id, toHtml(reply), aiUser.id);
  } catch (err) {
    logger.error("dream-conversation: reply failed", { roomId: room.id, err: String(err) });
    await persistAiMessage(room.id, "<p>Något gick fel på min sida — skriv gärna ditt svar igen.</p>", aiUser.id).catch(() => {});
  } finally {
    clearInterval(typing);
  }
}
