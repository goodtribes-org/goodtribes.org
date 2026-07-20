import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { htmlToPreviewText } from "@/lib/renderBody";
import NewProjectForm from "./NewProjectForm";
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

  const [skills, userOrgs] = await Promise.all([
    prisma.skill.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.organisation.findMany({
      where: { OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-lg mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-1">New project</h1>
      <p className="text-dark-slate/70 mb-8">
        {fromIdea
          ? "Starting from an idea — edit the details below."
          : fromThreadValid
            ? "Startar från en idésession i Idéverkstaden — redigera detaljerna nedan."
            : "Fill in the details for your project."}
      </p>
      <NewProjectForm
        initial={initial}
        ideaId={ideaId}
        fromThread={fromThreadValid ? fromThread : undefined}
        skills={skills}
        orgs={userOrgs}
      />
    </div>
  );
}
