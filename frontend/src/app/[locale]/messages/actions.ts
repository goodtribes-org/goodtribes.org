"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notify";
import { findOrCreateConversation } from "@/lib/conversations";

async function requireParticipant(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) throw new Error("Forbidden");
}

function assertValidBody(body: string) {
  const stripped = body.replace(/<[^>]*>/g, "").trim();
  if (!stripped || body.length > 10_000) throw new Error("Invalid message");
}

export async function sendDirectMessage(conversationId: string, body: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await requireParticipant(conversationId, session.user.id);
  assertValidBody(body);

  await prisma.directMessage.create({
    data: { conversationId, senderId: session.user.id, body },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  const recipients = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: session.user.id } },
    select: { userId: true },
  });
  const senderName = session.user.name ?? "Någon";
  await Promise.allSettled(
    recipients.map((r) =>
      createNotification({
        userId: r.userId,
        type: "direct_message",
        title: `Nytt meddelande från ${senderName}`,
        body: body.length > 120 ? `${body.slice(0, 120)}…` : body,
        url: `/messages/${conversationId}`,
      })
    )
  );

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
}

export async function startConversation(
  recipientUserId: string,
  firstMessage: string
): Promise<{ conversationId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const conversationId = await findOrCreateConversation(session.user.id, recipientUserId);
  await sendDirectMessage(conversationId, firstMessage);

  return { conversationId };
}

export async function markConversationRead(conversationId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId: session.user.id },
    data: { lastReadAt: new Date() },
  });
  revalidatePath("/messages");
}
