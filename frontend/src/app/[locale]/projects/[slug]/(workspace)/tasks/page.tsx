import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { isLeadRole } from "@/lib/authz";
import TasksPage from "@/components/TasksPage";
import type { Metadata } from "next";


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Uppgifter — GoodTribes.org` };
}

export default async function TasksRoutePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ card?: string }>;
}) {
  const { slug } = await params;
  const { card: openCardId } = await searchParams;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
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
        where: { hiddenAt: null },
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
      dependencies: { select: { dependsOnId: true } },
    },
  });

  // Real membership excludes FOLLOWER — a lightweight, non-member following
  // relationship (see isRealMember in @/lib/authz) that shouldn't grant
  // write access to kanban comments/likes/claims.
  const myRole = session?.user?.id ? project.members.find((m) => m.userId === session.user!.id)?.role : undefined;
  const isMember = !!myRole && myRole !== "FOLLOWER";
  const isLead = isLeadRole(project.members.find((m) => m.userId === session?.user?.id)?.role);

  const allCommentIds = cards.flatMap((c) => c.comments.map((cm) => cm.id));
  const likes = allCommentIds.length > 0
    ? await prisma.feedLike.findMany({
        where: { targetType: "kanbanCardComment", targetId: { in: allCommentIds } },
      })
    : [];
  const likeCountByCommentId = new Map<string, number>();
  const likedByMeCommentIds = new Set<string>();
  for (const l of likes) {
    likeCountByCommentId.set(l.targetId, (likeCountByCommentId.get(l.targetId) ?? 0) + 1);
    if (session?.user?.id && l.userId === session.user.id) likedByMeCommentIds.add(l.targetId);
  }

  const allCardIds = cards.map((c) => c.id);
  const cardLikes = allCardIds.length > 0
    ? await prisma.feedLike.findMany({
        where: { targetType: "kanbanCard", targetId: { in: allCardIds } },
      })
    : [];
  const likeCountByCardId = new Map<string, number>();
  const likedByMeCardIds = new Set<string>();
  for (const l of cardLikes) {
    likeCountByCardId.set(l.targetId, (likeCountByCardId.get(l.targetId) ?? 0) + 1);
    if (session?.user?.id && l.userId === session.user.id) likedByMeCardIds.add(l.targetId);
  }

  const cardsWithLikes = cards.map((c) => ({
    ...c,
    likeCount: likeCountByCardId.get(c.id) ?? 0,
    likedByMe: likedByMeCardIds.has(c.id),
    comments: c.comments.map((cm) => ({
      ...cm,
      likeCount: likeCountByCommentId.get(cm.id) ?? 0,
      likedByMe: likedByMeCommentIds.has(cm.id),
    })),
  }));

  const columns = {
    BACKLOG: cardsWithLikes.filter((c) => c.column === "BACKLOG"),
    TODO:    cardsWithLikes.filter((c) => c.column === "TODO"),
    DOING:   cardsWithLikes.filter((c) => c.column === "DOING"),
    REVIEW:  cardsWithLikes.filter((c) => c.column === "REVIEW"),
    DONE:    cardsWithLikes.filter((c) => c.column === "DONE"),
  };

  const members = project.members.map((m) => ({ id: m.user.id, name: m.user.name, image: m.user.image }));

  const milestones = await prisma.milestone.findMany({
    where: { projectId: project.id },
    select: { id: true, title: true, dueDate: true, status: true },
  });

  const helpGuide = await prisma.academyGuide.findFirst({
    where: { title: "Så använder du Kanban", published: true },
    select: { id: true },
  });
  const helpHref = helpGuide ? `/academy/${helpGuide.id}` : "/academy?category=Projektledning";

  return (
    <>
      <div style={{ width: "100vw", marginLeft: "calc(-50vw + 50%)", paddingLeft: "1.5rem", paddingRight: "1.5rem" }}>
        <TasksPage
          projectSlug={slug}
          initialColumns={columns}
          isLoggedIn={!!session?.user?.id}
          currentUserId={session?.user?.id ?? null}
          isMember={isMember}
          isLead={isLead}
          members={members}
          milestones={milestones}
          openCardId={openCardId ?? null}
          helpHref={helpHref}
        />
      </div>
    </>
  );
}
