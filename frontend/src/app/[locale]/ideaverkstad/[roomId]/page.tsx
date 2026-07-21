export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getRoomAccess } from "@/lib/roomAuth";
import { getRoomMentionables } from "@/lib/rooms";
import { RoomShell } from "@/app/[locale]/messages/[roomId]/RoomShell";
import MindMapSection from "./MindMapSection";
import type { Node, Edge } from "@xyflow/react";

export const metadata: Metadata = {
  title: "Idésession — Idéverkstaden",
};

export default async function IdeaThreadPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) redirect("/login");

  const access = await getRoomAccess(roomId, userId);
  if (!access || access.room.type !== "IDEA_THREAD") notFound();
  if (!access.canRead) notFound();

  const [room, messages, mentionables, mindMap] = await Promise.all([
    prisma.room.findUnique({
      where: { id: roomId },
      select: { convertedToIdeaId: true, convertedToProjectId: true },
    }),
    prisma.message.findMany({
      where: { roomId, hiddenAt: null },
      include: {
        author: { select: { id: true, name: true, image: true } },
        reactions: { select: { emoji: true, userId: true } },
        _count: { select: { threadReplies: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    getRoomMentionables(access.room, userId),
    prisma.mindMap.findUnique({ where: { roomId } }),
  ]);

  const alreadyConverted = !!room?.convertedToIdeaId || !!room?.convertedToProjectId;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link href="/ideaverkstad" className="text-sm text-dark-slate/50 hover:text-dark-slate">
          ← Idéverkstaden
        </Link>
        <div className="flex gap-2">
          {!alreadyConverted && (
            <>
              <Link
                href={`/ideas/new?fromThread=${roomId}`}
                className="px-3 py-1.5 text-xs font-medium rounded border border-muted-teal text-dark-slate/70 hover:border-seagrass hover:text-seagrass transition-colors"
              >
                Spara till Idéflödet
              </Link>
              <Link
                href={`/projects/new?fromThread=${roomId}`}
                className="px-3 py-1.5 text-xs font-medium rounded bg-coral text-white hover:bg-watermelon transition-colors"
              >
                Konvertera till projekt
              </Link>
            </>
          )}
          {access.room.isSandbox && (
            <Link
              href={`/fork/new?sourceType=sandboxRoom&sourceId=${roomId}`}
              className="px-3 py-1.5 text-xs font-medium rounded border border-amber-300 text-amber-700 hover:border-amber-500 transition-colors"
            >
              Gaffla till projekt
            </Link>
          )}
        </div>
      </div>

      <MindMapSection
        roomId={roomId}
        initialMindMap={
          mindMap
            ? { id: mindMap.id, nodes: mindMap.nodes as unknown as Node[], edges: mindMap.edges as unknown as Edge[] }
            : null
        }
      />

      <RoomShell
        room={{
          id: access.room.id,
          type: access.room.type,
          name: access.room.name,
          postingPolicy: access.room.postingPolicy,
          otherUsers: [],
          isSandbox: access.room.isSandbox,
        }}
        initialMessages={messages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        }))}
        currentUserId={userId}
        canPost={access.canPost}
        mentionables={mentionables}
      />
    </div>
  );
}
