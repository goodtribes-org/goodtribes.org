import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { timeAgo } from "@/lib/timeAgo";
import PostComposer from "@/components/PostComposer";
import ActivityPulseItem from "@/components/ActivityPulseItem";
import { fetchActivityItems } from "@/lib/activityFeed";

export default async function ActivityPulse() {
  const session = await auth();

  const items = await fetchActivityItems(5);
  const displayed = items.slice(0, 10);

  const targetsOr = displayed.map((i) => ({ targetType: i.targetType, targetId: i.targetId }));
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

  const distinctProjectIds = [...new Set(displayed.map((i) => i.projectId).filter((id): id is string => !!id))];
  const memberProjectIds = isLoggedIn && distinctProjectIds.length > 0
    ? new Set(
        (await prisma.projectMember.findMany({
          where: { userId: session!.user!.id, projectId: { in: distinctProjectIds } },
          select: { projectId: true },
        })).map((m) => m.projectId)
      )
    : new Set<string>();

  return (
    <div className="flex flex-col gap-3">
      <PostComposer isLoggedIn={isLoggedIn} />

      {displayed.map((item) => {
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
  );
}
