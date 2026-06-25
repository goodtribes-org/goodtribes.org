import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import NewProjectForm from "./NewProjectForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Project — GoodTribes.org",
};

const prisma = new PrismaClient();

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; title?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { from: ideaId, title: titleParam } = await searchParams;

  let initial: { title?: string; description?: string; sdgGoals?: number[] } = {};

  if (ideaId) {
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { title: true, description: true, sdgGoals: true },
    });
    if (idea) {
      initial = {
        title: titleParam ?? idea.title,
        description: idea.description ?? undefined,
        sdgGoals: idea.sdgGoals,
      };
    }
  } else if (titleParam) {
    initial = { title: titleParam };
  }

  const fromIdea = !!ideaId;

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
        {fromIdea ? "Starting from an idea — edit the details below." : "Fill in the details for your project."}
      </p>
      <NewProjectForm initial={initial} skills={skills} orgs={userOrgs} />
    </div>
  );
}
