import { getAiClientFor } from "@/lib/aiMode";
import { prisma } from "@/lib/prisma";
import { publishToRoom, publishToUser } from "@/lib/redis";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { getNotificationRecipients } from "@/lib/rooms";
import { escapeHtml } from "@/lib/renderBody";
import type { Room } from "@prisma/client";

const SYSTEM_PROMPT = `Du är en kreativ problemlösare och projektdesigner med djup kunskap
om globala samhällsutmaningar, social innovation och Agenda 2030.
Du deltar i en kollaborativ idédiskussion som en av flera deltagare.
Var koncis, inspirerande och bygg vidare på vad andra redan sagt.
Svara alltid på det språk som används i konversationen.`;

// AI_INTAKE (Paket E): a solo, AI-guided project-creation dialogue rather
// than a multi-person brainstorm. Effectuation questions first (vem är du,
// vad kan du, vem känner du — PRD Metodram, Idé-fasen), then problem/lösning
// mapping, then suggest generating a plan once there's enough to work with.
// "Framdrift, inte långa texter" (PRD): concrete next steps and short
// questions, never a long unstructured essay in one turn.
const AI_INTAKE_SYSTEM_PROMPT = `Du är en erfaren startup-coach som hjälper en person gå från idé till en konkret projektplan på GoodTribes.org.
Det här är en dialog med EN person, inte en gruppdiskussion.

Håll dig till den här ordningen, men naturligt — inga numrerade listor eller långa textstycken:
1. Om personen inte redan beskrivit vad de vill göra: fråga "Vad vill du göra? Vilket problem vill du lösa?"
2. Ställ sedan Effectuation-frågorna, en i taget: vem är du (bakgrund/kompetens), vad kan du (resurser/färdigheter du redan har), vem känner du (nätverk/samarbetspartners).
3. Kartlägg därefter själva problemet och lösningen konkret — vem har problemet, hur löser idén det, vad gör den unik.
4. När du bedömer att du har tillräckligt (vanligtvis efter 4-8 utbyten): föreslå konkret "Jag tror jag har det jag behöver — vill du att jag skapar en plan?"

Var kort och konkret i varje svar — en fråga eller ett konstaterande i taget, aldrig en lång sammanhängande text. Svara alltid på det språk personen skriver på.

VIKTIGT: Skriv ALDRIG rå JSON eller kod i dina svar i den här dialogen — bara vanlig konversation. Ett separat, senare steg genererar den faktiska planen.`;

function stripHtml(body: string): string {
  return body.replace(/<[^>]*>/g, "").trim();
}

async function buildSystemPrompt(room: Room): Promise<string> {
  if (room.type === "AI_INTAKE") return AI_INTAKE_SYSTEM_PROMPT;
  if (!room.projectId) return SYSTEM_PROMPT;
  const project = await prisma.project.findUnique({
    where: { id: room.projectId },
    select: { title: true, description: true },
  });
  if (!project) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\nProjektkontext: ${project.title} — ${project.description ?? "Ingen beskrivning ännu"}`;
}

export async function persistAiMessage(roomId: string, body: string, aiUserId: string) {
  const message = await prisma.message.create({
    data: { roomId, authorId: aiUserId, body, isAi: true },
    include: {
      author: { select: { id: true, name: true, image: true } },
      reactions: { select: { emoji: true, userId: true } },
      _count: { select: { threadReplies: true } },
    },
  });
  await prisma.room.update({ where: { id: roomId }, data: { lastMessageAt: new Date() } });
  // Same envelope sendRoomMessage publishes — RoomShell's SSE handler reads
  // data.message, so a bare message here crashed open chat windows instead
  // of showing the AI's reply live.
  publishToRoom(roomId, { type: "created", message });

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (room) {
    const recipients = await getNotificationRecipients(room, aiUserId);
    if (recipients.length > 0) {
      const title = "AI svarade i Idéverkstaden";
      const notifBody = stripHtml(body).slice(0, 120);
      const url = `/ideaverkstad/${roomId}`;
      await prisma.notification
        .createMany({
          data: recipients.map((recipientId) => ({
            userId: recipientId,
            type: "room_message",
            title,
            body: notifBody,
            url,
          })),
        })
        .catch(() => {});
      const createdAt = new Date().toISOString();
      for (const recipientId of recipients) {
        publishToUser(recipientId, {
          type: "notification",
          notification: { id: crypto.randomUUID(), type: "room_message", title, body: notifBody, url, read: false, createdAt },
        });
        publishToUser(recipientId, { type: "room-message", roomId });
      }
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
export async function triggerAiThreadReply(room: Room, triggeredByUserId: string): Promise<void> {
  const aiUser = await getAiParticipantUser();

  try {
    // Rate-limited on whoever's message mentioned @AI (enforced inside the
    // gate): this is a real Anthropic call triggered by a chat message, not
    // behind a dedicated "ask AI" button, so an active thread could
    // otherwise generate one call per @AI mention with no cap. A
    // project-scoped idea thread also follows the project's AI mode.
    const gate = await getAiClientFor({
      feature: "ai-thread-reply",
      kind: "assist",
      userId: triggeredByUserId,
      projectId: room.projectId,
    });
    if (!gate.ok) {
      const text =
        gate.reason === "not_configured"
          ? "AI är inte konfigurerad just nu."
          : gate.reason === "mode"
            ? "AI är avstängt i projektets AI-inställningar."
            : "AI är tillfälligt otillgänglig just nu, försök igen om en stund.";
      await persistAiMessage(room.id, text, aiUser.id);
      return;
    }
    const { client } = gate;

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
