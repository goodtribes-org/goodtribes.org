import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { publishToRoom } from "@/lib/redis";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { getNotificationRecipients } from "@/lib/rooms";
import { escapeHtml } from "@/lib/renderBody";
import type { Room } from "@prisma/client";

const SYSTEM_PROMPT = `Du är en kreativ problemlösare och projektdesigner med djup kunskap
om globala samhällsutmaningar, social innovation och Agenda 2030.
Du deltar i en kollaborativ idédiskussion som en av flera deltagare.
Var koncis, inspirerande och bygg vidare på vad andra redan sagt.
Svara alltid på det språk som används i konversationen.`;

function stripHtml(body: string): string {
  return body.replace(/<[^>]*>/g, "").trim();
}

async function buildSystemPrompt(room: Room): Promise<string> {
  if (!room.projectId) return SYSTEM_PROMPT;
  const project = await prisma.project.findUnique({
    where: { id: room.projectId },
    select: { title: true, description: true },
  });
  if (!project) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\nProjektkontext: ${project.title} — ${project.description ?? "Ingen beskrivning ännu"}`;
}

async function persistAiMessage(roomId: string, body: string, aiUserId: string) {
  const message = await prisma.message.create({
    data: { roomId, authorId: aiUserId, body, isAi: true },
    include: {
      author: { select: { id: true, name: true, image: true } },
      reactions: { select: { emoji: true, userId: true } },
      _count: { select: { threadReplies: true } },
    },
  });
  await prisma.room.update({ where: { id: roomId }, data: { lastMessageAt: new Date() } });
  publishToRoom(roomId, message);

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (room) {
    const recipients = await getNotificationRecipients(room, aiUserId);
    if (recipients.length > 0) {
      await prisma.notification
        .createMany({
          data: recipients.map((recipientId) => ({
            userId: recipientId,
            type: "room_message",
            title: "AI svarade i Idéverkstaden",
            body: stripHtml(body).slice(0, 120),
            url: `/ideaverkstad/${roomId}`,
          })),
        })
        .catch(() => {});
    }
  }

  return message;
}

// Fire-and-forget: called without awaiting from sendRoomMessage when a
// message mentions the AI participant. Reads the thread's full flat
// message history (Idéverkstaden never nests replies — every message is a
// root message, PRD 5.10's "brainstorming-rum" framing) and reconstructs it
// as a multi-turn conversation, matching the PRD's own code sketch (§5.11:
// `messages: threadMessages // hela tråden inkl. alla användares inlägg`).
export async function triggerAiThreadReply(room: Room): Promise<void> {
  const aiUser = await getAiParticipantUser();

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      await persistAiMessage(room.id, "AI är inte konfigurerad just nu.", aiUser.id);
      return;
    }

    const history = await prisma.message.findMany({
      where: { roomId: room.id, hiddenAt: null },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { name: true } } },
    });

    const threadMessages = history.map((m) => ({
      role: (m.isAi ? "assistant" : "user") as "assistant" | "user",
      content: `${m.author.name ?? "Någon"}: ${stripHtml(m.body)}`,
    }));

    const system = await buildSystemPrompt(room);
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
      messages: threadMessages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    await persistAiMessage(room.id, `<p>${escapeHtml(text)}</p>`, aiUser.id);
  } catch {
    await persistAiMessage(
      room.id,
      "Kunde inte generera ett svar just nu, försök igen.",
      aiUser.id
    ).catch(() => {});
  }
}
