import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { htmlToPreviewText } from "@/lib/renderBody";
import NewProjectGuide from "./NewProjectGuide";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Project — GoodTribes.org",
};


export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; fromThread?: string; title?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { from: ideaId, fromThread, title: titleParam } = await searchParams;

  let initial: { title?: string; description?: string; sdgGoals?: number[]; category?: string; tags?: string[]; imageUrl?: string } = {};

  if (ideaId) {
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { title: true, description: true, problem: true, solution: true, sdgGoals: true, category: true, tags: true, imageUrl: true },
    });
    if (idea) {
      const descParts = [idea.description, idea.problem, idea.solution].filter(Boolean);
      initial = {
        title: titleParam ?? idea.title,
        description: descParts.join("\n\n") || undefined,
        sdgGoals: idea.sdgGoals,
        category: idea.category ?? undefined,
        tags: idea.tags,
        imageUrl: idea.imageUrl ?? undefined,
      };
    }
  } else if (fromThread) {
    const [room, firstMessage] = await Promise.all([
      prisma.room.findFirst({ where: { id: fromThread, type: "IDEA_THREAD" }, select: { name: true } }),
      prisma.message.findFirst({ where: { roomId: fromThread }, orderBy: { createdAt: "asc" }, select: { body: true } }),
    ]);
    if (room) {
      initial = {
        title: titleParam ?? room.name ?? undefined,
        description: firstMessage
          ? `${htmlToPreviewText(firstMessage.body)}\n\n(Från en diskussion i Idéverkstaden.)`
          : undefined,
      };
    }
  } else if (titleParam) {
    initial = { title: titleParam };
  }

  const fromIdea = !!ideaId;
  const fromThreadValid = !ideaId && !!fromThread;

  return (
    <div>
      <NewProjectGuide
        initial={initial}
        ideaId={ideaId}
        fromThread={fromThreadValid ? fromThread : undefined}
        contextNote={
          fromIdea
            ? "Starting from an idea — give the project a name, then fill in the rest right after."
            : fromThreadValid
              ? "Startar från en idésession i Idéverkstaden — ge projektet ett namn, fyll i resten direkt efter."
              : undefined
        }
      />
    </div>
  );
}
