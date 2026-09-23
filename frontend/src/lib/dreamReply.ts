import type { Room } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAiClientFor } from "@/lib/aiMode";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { persistAiMessage } from "@/lib/aiThreadReply";
import { escapeHtml } from "@/lib/renderBody";
import { logger } from "@/lib/logger";
import { mergeDreamState, parseDreamState, parseOpenQuestions } from "@/lib/dreamConversation";
import { DREAM_REPLY_TOOL, DREAM_SYSTEM_PROMPT, dreamProgressNote } from "@/lib/prompts/dreamConversation";

function stripHtml(body: string): string {
  return body.replace(/<[^>]*>/g, "").trim();
}

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
    const turns = history.map((m) => ({ role: (m.isAi ? "assistant" : "user") as "assistant" | "user", content: stripHtml(m.body) }));
    if (turns[0]?.role === "assistant") turns.unshift({ role: "user", content: "(Personen öppnade Drömsamtalet.)" });
    if (turns[turns.length - 1]?.role !== "user") return;

    const previous = parseDreamState(dream.state);
    const openQuestions = parseOpenQuestions(dream.openQuestions);
    const system =
      DREAM_SYSTEM_PROMPT +
      dreamProgressNote({
        covered: previous.covered,
        notes: previous.notes,
        openQuestions,
        aiQuestionCount: history.filter((m) => m.isAi).length,
      });

    const response = await gate.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
      tools: [DREAM_REPLY_TOOL],
      tool_choice: { type: "tool", name: DREAM_REPLY_TOOL.name },
      messages: turns,
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
  }
}
