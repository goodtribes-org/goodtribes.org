export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getRoomAccess } from "@/lib/roomAuth";
import { getRoomMentionables } from "@/lib/rooms";
import { RoomShell } from "@/app/[locale]/messages/[roomId]/RoomShell";

export const metadata: Metadata = {
  title: "Idésession — Idéverkstaden",
};

export default async function IdeaThreadPage({
  params,
}: {
  params: Promise<{ roomId: string; locale: string }>;
}) {
  const { roomId, locale } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) redirect("/login");
  const t = await getTranslations({ locale, namespace: "IdeaThreadPage" });

  const access = await getRoomAccess(roomId, userId);
  if (!access || access.room.type !== "IDEA_THREAD") notFound();
  if (!access.canRead) notFound();

  const [room, messages, participants, mentionables] = await Promise.all([
    prisma.room.findUnique({
      where: { id: roomId },
      select: { convertedToIdeaId: true, convertedToProjectId: true },
    }),
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
    prisma.roomParticipant.findMany({
      where: { roomId },
      select: { userId: true, lastReadAt: true },
    }),
    getRoomMentionables(access.room, userId),
  ]);

  const alreadyConverted = !!room?.convertedToIdeaId || !!room?.convertedToProjectId;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link href="/ideaverkstad" className="text-sm text-dark-slate/50 hover:text-dark-slate">
          {t("backToIdeaverkstad")}
        </Link>
        <div className="flex gap-2">
          {!alreadyConverted && (
            <>
              <Link
                href={`/ideas/new?fromThread=${roomId}`}
                className="px-3 py-1.5 text-xs font-medium rounded border border-muted-teal text-dark-slate/70 hover:border-seagrass hover:text-seagrass transition-colors"
              >
                {t("saveToIdeaFeed")}
              </Link>
              <Link
                href={`/projects/new?fromThread=${roomId}`}
                className="px-3 py-1.5 text-xs font-medium rounded bg-coral text-white hover:bg-watermelon transition-colors"
              >
                {t("convertToProject")}
              </Link>
            </>
          )}
        </div>
      </div>

      <RoomShell
        room={{
          id: access.room.id,
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
        canPost={access.canPost}
        mentionables={mentionables}
      />
    </div>
  );
}
