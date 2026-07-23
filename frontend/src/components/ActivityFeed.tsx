import PostComposer from "@/components/PostComposer";
import ActivityPulseItem from "@/components/ActivityPulseItem";
import Pagination from "@/components/Pagination";
import { MEMBERSHIP_GATED_TARGET_TYPES, type PulseItem, type FeedComment } from "@/lib/activityFeed";

// Shared body (composer + item list + pagination) between the global feed
// (/feed) and each project's own scoped feed — same rendering, just fed
// different (global vs. project-filtered) data by the caller.
export default function ActivityFeed({
  pageItems,
  isLoggedIn,
  page,
  pageStr,
  total,
  perPage,
  basePath,
  likeCountByTarget,
  likedByMe,
  commentsByTarget,
  memberProjectIds,
  pendingJoinProjectIds,
  projectId,
  emptyMessage = "Ingen aktivitet ännu.",
}: {
  pageItems: PulseItem[];
  isLoggedIn: boolean;
  page: number;
  pageStr?: string;
  total: number;
  perPage: number;
  basePath: string;
  likeCountByTarget: Map<string, number>;
  likedByMe: Set<string>;
  commentsByTarget: Map<string, FeedComment[]>;
  memberProjectIds: Set<string>;
  pendingJoinProjectIds: Set<string>;
  projectId?: string;
  emptyMessage?: string;
}) {
  return (
    <>
      {page === 1 && <PostComposer isLoggedIn={isLoggedIn} projectId={projectId} />}

      {pageItems.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-lg p-12 text-center">
          <p className="text-dark-slate/40 text-sm">{emptyMessage}</p>
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

      <Pagination page={page} total={total} perPage={perPage} searchParams={{ page: pageStr }} basePath={basePath} />
    </>
  );
}
