import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import TasksPage from "@/components/TasksPage";
import type { Metadata } from "next";


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Uppgifter — GoodTribes.org` };
}

export default async function TasksRoutePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      title: true,
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
    },
  });
  if (!project) notFound();

  const session = await auth();

  const cards = await prisma.kanbanCard.findMany({
    where: { projectSlug: slug },
    orderBy: [{ column: "asc" }, { order: "asc" }],
    include: {
      createdBy: { select: { name: true, image: true } },
      assignee: { select: { id: true, name: true, image: true } },
      estimate: true,
      subtasks: { orderBy: { order: "asc" } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
      aiTaskRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          agentType: true,
          status: true,
          outputMarkdown: true,
          attemptNumber: true,
          completedAt: true,
        },
      },
    },
  });

  const columns = {
    BACKLOG: cards.filter((c) => c.column === "BACKLOG"),
    TODO:    cards.filter((c) => c.column === "TODO"),
    DOING:   cards.filter((c) => c.column === "DOING"),
    REVIEW:  cards.filter((c) => c.column === "REVIEW"),
    DONE:    cards.filter((c) => c.column === "DONE"),
  };

  const members = project.members.map((m) => ({ id: m.user.id, name: m.user.name, image: m.user.image }));

  return (
    <>
      <div style={{ width: "100vw", marginLeft: "calc(-50vw + 50%)", paddingLeft: "1.5rem", paddingRight: "1.5rem" }}>
        <TasksPage
          projectSlug={slug}
          initialColumns={columns}
          isLoggedIn={!!session?.user?.id}
          currentUserId={session?.user?.id ?? null}
          members={members}
        />
      </div>
    </>
  );
}
