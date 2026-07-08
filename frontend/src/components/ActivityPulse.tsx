import { auth } from "@/auth";
import PostComposer from "@/components/PostComposer";
import ActivityPulseItem from "@/components/ActivityPulseItem";
import { fetchActivityItems, getFeedInteractionData, MEMBERSHIP_GATED_TARGET_TYPES } from "@/lib/activityFeed";

export default async function ActivityPulse() {
  const session = await auth();

  const items = await fetchActivityItems(5);
  const displayed = items.slice(0, 10);

  const isLoggedIn = !!session?.user?.id;
  const { likeCountByTarget, likedByMe, commentsByTarget, memberProjectIds, pendingJoinProjectIds } =
    await getFeedInteractionData(displayed, session?.user?.id ?? null);

  return (
    <div className="flex flex-col gap-3">
      <PostComposer isLoggedIn={isLoggedIn} />

      {displayed.map((item) => {
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
  );
}
