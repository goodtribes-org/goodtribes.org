import { prisma } from "@/lib/prisma";

export async function isConversationUnread(conversationId: string, userId: string, lastReadAt: Date): Promise<boolean> {
  const unreadMessage = await prisma.directMessage.findFirst({
    where: { conversationId, senderId: { not: userId }, createdAt: { gt: lastReadAt } },
    select: { id: true },
  });
  return !!unreadMessage;
}

export async function getUnreadConversationCount(userId: string): Promise<number> {
  const participants = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true, lastReadAt: true },
  });

  const unreadFlags = await Promise.all(
    participants.map((p) => isConversationUnread(p.conversationId, userId, p.lastReadAt))
  );
  return unreadFlags.filter(Boolean).length;
}

export async function findOrCreateConversation(userIdA: string, userIdB: string): Promise<string> {
  if (userIdA === userIdB) throw new Error("Cannot message yourself");

  const pairKey = [userIdA, userIdB].sort().join("_");
  const conversation = await prisma.conversation.upsert({
    where: { pairKey },
    create: {
      pairKey,
      participants: { create: [{ userId: userIdA }, { userId: userIdB }] },
    },
    update: {},
  });
  return conversation.id;
}
