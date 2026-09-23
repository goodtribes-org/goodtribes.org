export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRoomAccess } from "@/lib/roomAuth";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { isDreamComplete, parseDreamState, parseOpenQuestions } from "@/lib/dreamConversation";
import { RoomShell } from "@/app/[locale]/messages/[roomId]/RoomShell";
import DreamProgressBar from "./DreamProgressBar";
import DreamActions from "./DreamActions";
import DreamNextStep from "./DreamNextStep";

export default async function DreamConversationPage({ params }: { params: Promise<{ locale: Locale; roomId: string }> }) {
  const { locale, roomId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  if (!(await isAiProjectStartAvailable(userId))) redirect("/projects/new");

  const [dream, access, t] = await Promise.all([
    prisma.dreamConversation.findUnique({ where: { roomId } }),
    getRoomAccess(roomId, userId),
    getTranslations({ locale, namespace: "DreamConversation" }),
  ]);
  // Only the initiativtagare who started it may see it — it can contain
  // personal information.
  if (!dream || dream.userId !== userId || !access?.canRead) notFound();

  const [messages, participants] = await Promise.all([
    prisma.message.findMany({
      where: { roomId, hiddenAt: null },
      include: {
        author: { select: { id: true, name: true, image: true } },
        reactions: { select: { emoji: true, userId: true } },
        attachments: { select: { id: true, key: true, name: true, mimeType: true, size: true } },
        _count: { select: { threadReplies: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    prisma.roomParticipant.findMany({ where: { roomId }, select: { userId: true, lastReadAt: true } }),
  ]);

  const state = parseDreamState(dream.state);
  const initialProgress = {
    covered: state.covered,
    openQuestionCount: parseOpenQuestions(dream.openQuestions).length,
    complete: isDreamComplete(state),
    status: dream.status,
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-dark-slate">{t("heading")}</h1>
            <p className="mt-1 text-sm text-dark-slate/60">{t("intro")}</p>
          </div>
          <DreamActions roomId={roomId} />
        </div>
        <DreamProgressBar roomId={roomId} initial={initialProgress} />
      </div>

      <RoomShell
        room={{
          id: roomId,
          type: access.room.type,
          name: access.room.name,
          postingPolicy: access.room.postingPolicy,
          otherUsers: [],
          participants: participants.map((p) => ({ userId: p.userId, lastReadAt: p.lastReadAt.toISOString() })),
        }}
        initialMessages={messages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
          editedAt: m.editedAt ? m.editedAt.toISOString() : null,
          deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
        }))}
        currentUserId={userId}
        canPost={access.canPost && dream.status === "in_progress"}
        mentionables={[]}
      />

      <DreamNextStep roomId={roomId} initial={initialProgress} />
    </div>
  );
}
