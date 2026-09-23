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
import { generateAiProjectPlan } from "./plan/actions";

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
  if (!access || (access.room.type !== "IDEA_THREAD" && access.room.type !== "AI_INTAKE")) notFound();
  if (!access.canRead) notFound();
  const isAiIntake = access.room.type === "AI_INTAKE";
  // A Drömsamtal is an AI_INTAKE room too, but it lives in the new-project
  // flow, not in Idéverkstaden.
  if (isAiIntake && (await prisma.dreamConversation.count({ where: { roomId } }))) {
    redirect(`/projects/new/samtal/${roomId}`);
  }

  const [room, messages, participants, mentionables] = await Promise.all([
    prisma.room.findUnique({
      where: { id: roomId },
      select: { convertedToIdeaId: true, convertedToProjectId: true, aiProjectPlan: { select: { status: true } } },
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
          {!alreadyConverted && !isAiIntake && (
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
          {isAiIntake && !alreadyConverted && (
            room?.aiProjectPlan ? (
              <Link
                href={`/ideaverkstad/${roomId}/plan`}
                className="px-3 py-1.5 text-xs font-medium rounded bg-coral text-white hover:bg-watermelon transition-colors"
              >
                {t("viewPlanDraft")}
              </Link>
            ) : (
              <form action={generateAiProjectPlan.bind(null, roomId)}>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium rounded bg-coral text-white hover:bg-watermelon transition-colors"
                >
                  {t("generatePlanCta")}
                </button>
              </form>
            )
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
