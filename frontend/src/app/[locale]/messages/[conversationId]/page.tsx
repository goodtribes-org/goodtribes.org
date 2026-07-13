export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { MessageThreadShell } from "./MessageThreadShell";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) notFound();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      participants: {
        where: { userId: { not: userId } },
        select: { user: { select: { id: true, name: true, image: true } } },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { id: true, body: true, createdAt: true, senderId: true },
      },
    },
  });
  if (!conversation) notFound();

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });

  const otherUser = conversation.participants[0]?.user ?? null;

  return (
    <MessageThreadShell
      conversationId={conversationId}
      currentUserId={userId}
      otherUser={otherUser}
      initialMessages={conversation.messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}
