export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/auth";
import PostComposer from "@/components/PostComposer";
import ActivityPulseItem from "@/components/ActivityPulseItem";
import Pagination from "@/components/Pagination";
import { fetchActivityItems, getFeedInteractionData, MEMBERSHIP_GATED_TARGET_TYPES } from "@/lib/activityFeed";

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

  const isLoggedIn = !!session?.user?.id;
  const { likeCountByTarget, likedByMe, commentsByTarget, memberProjectIds, pendingJoinProjectIds } =
    await getFeedInteractionData(pageItems, session?.user?.id ?? null);

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
            const isMemberOfProject = !!item.projectId && memberProjectIds.has(item.projectId);
            const canJoin = isLoggedIn && !!item.projectId && !isMemberOfProject;
            const requiresMembership = MEMBERSHIP_GATED_TARGET_TYPES.has(item.targetType);
            const joinCta =
              requiresMembership && !isMemberOfProject && item.projectId && item.projectSlug
                ? {
                    projectId: item.projectId,
                    slug: item.projectSlug,
                    existingStatus: pendingJoinProjectIds.has(item.projectId) ? "pending" : null,
                  }
                : null;
            return (
              <ActivityPulseItem
                key={item.id}
                item={item}
                isLoggedIn={isLoggedIn}
                canJoin={canJoin}
                requiresMembership={requiresMembership}
                isProjectMember={isMemberOfProject}
                joinCta={joinCta}
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
