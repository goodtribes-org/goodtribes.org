export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { timeAgo } from "@/lib/timeAgo";
import PostComposer from "@/components/PostComposer";
import ActivityPulseItem from "@/components/ActivityPulseItem";
import Pagination from "@/components/Pagination";
import { fetchActivityItems } from "@/lib/activityFeed";

export const metadata: Metadata = {
  title: "Plattformsflöde — GoodTribes.org",
  description: "Senaste aktivitet från hela GoodTribes",
};

const PAGE_SIZE = 20;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const session = await auth();

  // Each source is over-fetched up to the current page's window, so `total` (and thus
  // pagination) grows as the user pages further rather than reflecting the true lifetime count.
  const allItems = await fetchActivityItems(page * PAGE_SIZE);
  const total = allItems.length;
  const pageItems = allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const targetsOr = pageItems.map((i) => ({ targetType: i.targetType, targetId: i.targetId }));
  const [likes, comments] = targetsOr.length > 0
    ? await Promise.all([
        prisma.feedLike.findMany({ where: { OR: targetsOr } }),
        prisma.feedComment.findMany({
          where: { OR: targetsOr },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true } } },
        }),
      ])
    : [[], []];

  const likeCountByTarget = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of likes) {
    const key = `${l.targetType}:${l.targetId}`;
    likeCountByTarget.set(key, (likeCountByTarget.get(key) ?? 0) + 1);
    if (session?.user?.id && l.userId === session.user.id) likedByMe.add(key);
  }

  const commentsByTarget = new Map<string, { id: string; author: string; body: string; timeAgo: string }[]>();
  for (const c of comments) {
    const key = `${c.targetType}:${c.targetId}`;
    const arr = commentsByTarget.get(key) ?? [];
    arr.push({ id: c.id, author: c.author.name ?? "Någon", body: c.body, timeAgo: timeAgo(c.createdAt) });
    commentsByTarget.set(key, arr);
  }

  const isLoggedIn = !!session?.user?.id;

  const distinctProjectIds = [...new Set(pageItems.map((i) => i.projectId).filter((id): id is string => !!id))];
  const memberProjectIds = isLoggedIn && distinctProjectIds.length > 0
    ? new Set(
        (await prisma.projectMember.findMany({
          where: { userId: session!.user!.id, projectId: { in: distinctProjectIds } },
          select: { projectId: true },
        })).map((m) => m.projectId)
      )
    : new Set<string>();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-slate">Plattformsflöde</h1>
        <p className="text-sm text-dark-slate/50 mt-1">Senaste aktivitet från hela GoodTribes</p>
      </div>

      {page === 1 && <PostComposer isLoggedIn={isLoggedIn} />}

      {pageItems.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-lg p-12 text-center">
          <p className="text-dark-slate/40 text-sm">Ingen aktivitet ännu.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pageItems.map((item) => {
            const key = `${item.targetType}:${item.targetId}`;
            const canJoin = isLoggedIn && !!item.projectId && !memberProjectIds.has(item.projectId);
            return (
              <ActivityPulseItem
                key={item.id}
                item={item}
                isLoggedIn={isLoggedIn}
                canJoin={canJoin}
                initialLikeCount={likeCountByTarget.get(key) ?? 0}
                initialLiked={likedByMe.has(key)}
                initialComments={commentsByTarget.get(key) ?? []}
              />
            );
          })}
        </div>
      )}

      <Pagination page={page} total={total} perPage={PAGE_SIZE} searchParams={{ page: pageStr }} basePath="/feed" />
    </div>
  );
}
