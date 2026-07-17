import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/timeAgo";
import type { LikeCommentEntry } from "@/components/LikeCommentBlock";

// Fetches FeedLike/FeedComment data for a single standalone target (as
// opposed to activityFeed.ts's getFeedInteractionData, which batches this
// for many feed items at once) — used by content types that show like+
// comment UI on their own detail page rather than in the activity feed.
export async function getLikeCommentData(
  targetType: string,
  targetId: string,
  userId: string | null
): Promise<{ likeCount: number; liked: boolean; comments: LikeCommentEntry[] }> {
  const [likeCount, liked, comments] = await Promise.all([
    prisma.feedLike.count({ where: { targetType, targetId } }),
    userId
      ? prisma.feedLike.findUnique({
          where: { userId_targetType_targetId: { userId, targetType, targetId } },
        })
      : Promise.resolve(null),
    prisma.feedComment.findMany({
      where: { targetType, targetId, hiddenAt: null },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { name: true } } },
    }),
  ]);

  return {
    likeCount,
    liked: !!liked,
    comments: comments.map((c) => ({
      id: c.id,
      author: c.author.name ?? "Någon",
      body: c.body,
      timeAgo: timeAgo(c.createdAt),
    })),
  };
}
