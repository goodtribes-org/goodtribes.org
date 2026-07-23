export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import type { Metadata } from "next";
import ActivityFeed from "@/components/ActivityFeed";
import { fetchActivityItems, getFeedInteractionData } from "@/lib/activityFeed";

const PAGE_SIZE = 20;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Flöde — GoodTribes.org` };
}

export default async function ProjectActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);

  const [session, project] = await Promise.all([
    auth(),
    prisma.project.findUnique({ where: { slug }, select: { id: true, title: true } }),
  ]);
  if (!project) notFound();

  // Each source is over-fetched up to the current page's window, so `total` (and thus
  // pagination) grows as the user pages further rather than reflecting the true lifetime count.
  const allItems = await fetchActivityItems(page * PAGE_SIZE, { projectId: project.id, projectSlug: slug });
  const total = allItems.length;
  const pageItems = allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const isLoggedIn = !!session?.user?.id;
  const { likeCountByTarget, likedByMe, commentsByTarget, memberProjectIds, pendingJoinProjectIds } =
    await getFeedInteractionData(pageItems, session?.user?.id ?? null);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-slate">Flöde</h1>
        <p className="text-sm text-dark-slate/50 mt-1">Senaste aktivitet i {project.title}</p>
      </div>

      <ActivityFeed
        pageItems={pageItems}
        isLoggedIn={isLoggedIn}
        page={page}
        pageStr={pageStr}
        total={total}
        perPage={PAGE_SIZE}
        basePath={`/projects/${slug}/activity`}
        likeCountByTarget={likeCountByTarget}
        likedByMe={likedByMe}
        commentsByTarget={commentsByTarget}
        memberProjectIds={memberProjectIds}
        pendingJoinProjectIds={pendingJoinProjectIds}
        projectId={project.id}
        emptyMessage="Ingen aktivitet i projektet ännu."
      />
    </div>
  );
}
