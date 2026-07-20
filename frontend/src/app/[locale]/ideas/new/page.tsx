import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { htmlToPreviewText } from "@/lib/renderBody";
import NewIdeaForm from "./NewIdeaForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Idea — GoodTribes.org",
};

export default async function NewIdeaPage({
  searchParams,
}: {
  searchParams: Promise<{ fromThread?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { fromThread } = await searchParams;

  // Prefill from an Idéverkstaden thread's opening message, mirroring how
  // projects/new prefills from ?from={ideaId}.
  let initial: { title?: string; problem?: string } | undefined;
  if (fromThread) {
    const [room, firstMessage] = await Promise.all([
      prisma.room.findFirst({ where: { id: fromThread, type: "IDEA_THREAD" }, select: { name: true } }),
      prisma.message.findFirst({ where: { roomId: fromThread }, orderBy: { createdAt: "asc" }, select: { body: true } }),
    ]);
    if (room) {
      initial = {
        title: room.name ?? undefined,
        problem: firstMessage ? htmlToPreviewText(firstMessage.body) : undefined,
      };
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Share an idea</h1>
        <p className="text-dark-slate/60 text-sm">
          Got an idea that could make an impact? Walk through the steps below — the more detail you provide, the more likely others will rally behind it.
        </p>
      </div>
      <NewIdeaForm initial={initial} fromThread={fromThread} />
    </div>
  );
}
