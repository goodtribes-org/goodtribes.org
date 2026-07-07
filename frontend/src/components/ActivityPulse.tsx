import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { timeAgo } from "@/lib/timeAgo";
import PostComposer from "@/components/PostComposer";
import FeedItemActions from "@/components/FeedItemActions";

type PulseItem = {
  id: string;
  targetType: string;
  targetId: string;
  avatarName: string | null;
  avatarImage: string | null;
  projectImage?: string | null;
  projectId?: string | null;
  projectName: string;
  projectHref?: string | null;
  action: string;
  body?: string;
  imageUrl?: string | null;
  href: string | null;
  date: Date;
};

export default async function ActivityPulse() {
  const session = await auth();
  const LIMIT = 5;

  const [feedPosts, blogPosts, milestones, projects, ideas, activities, channelMessages, kanbanComments, ideaComments] =
    await Promise.all([
      prisma.feedPost.findMany({
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, body: true, imageUrl: true, createdAt: true,
          author: { select: { name: true, image: true } },
        },
      }),
      prisma.blogPost.findMany({
        where: { project: { visibility: "public" } },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, title: true, projectSlug: true, createdAt: true,
          author: { select: { name: true, image: true } },
          project: { select: { id: true, title: true, imageUrl: true } },
        },
      }),
      prisma.milestone.findMany({
        where: { status: "done", project: { visibility: "public" } },
        orderBy: { updatedAt: "desc" },
        take: LIMIT,
        select: {
          id: true, title: true, updatedAt: true,
          createdBy: { select: { name: true, image: true } },
          project: { select: { id: true, title: true, slug: true, imageUrl: true } },
        },
      }),
      prisma.project.findMany({
        where: { visibility: "public" },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, title: true, slug: true, createdAt: true, imageUrl: true,
          owner: { select: { name: true, image: true } },
        },
      }),
      prisma.idea.findMany({
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, title: true, createdAt: true,
          author: { select: { name: true, image: true } },
        },
      }),
      prisma.activityEvent.findMany({
        where: {
          type: { in: ["task_completed", "todo_completed", "member_joined"] },
          project: { visibility: "public" },
        },
        orderBy: { createdAt: "desc" },
        take: LIMIT * 2,
        select: {
          id: true, type: true, createdAt: true,
          user: { select: { name: true, image: true } },
          project: { select: { id: true, title: true, slug: true, imageUrl: true } },
        },
      }),
      prisma.channelMessage.findMany({
        where: {
          threadParentId: null,
          channel: { project: { visibility: "public" } },
        },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, createdAt: true,
          author: { select: { name: true, image: true } },
          channel: { select: { project: { select: { id: true, title: true, slug: true, imageUrl: true } } } },
        },
      }),
      prisma.kanbanCardComment.findMany({
        where: { card: { project: { visibility: "public" } } },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, createdAt: true,
          author: { select: { name: true, image: true } },
          card: {
            select: {
              title: true, projectSlug: true,
              project: { select: { id: true, title: true, imageUrl: true } },
            },
          },
        },
      }),
      prisma.ideaComment.findMany({
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, createdAt: true,
          author: { select: { name: true, image: true } },
          idea: { select: { id: true, title: true } },
        },
      }),
    ]);

  const activityLabel: Record<string, string> = {
    member_joined:  "gick med i projektet",
    task_completed: "slutförde en uppgift",
    todo_completed: "checkade av en punkt",
  };

  const items: PulseItem[] = [
    ...feedPosts.map((p) => ({
      id: `post-${p.id}`, targetType: "feedPost", targetId: p.id,
      avatarName: p.author.name, avatarImage: p.author.image,
      projectName: "Inlägg", projectHref: null, projectId: null,
      action: "skrev ett inlägg",
      body: p.body,
      imageUrl: p.imageUrl,
      href: null, date: p.createdAt,
    })),
    ...blogPosts.map((p) => ({
      id: `blog-${p.id}`, targetType: "blogPost", targetId: p.id,
      avatarName: p.author.name, avatarImage: p.author.image, projectImage: p.project.imageUrl,
      projectName: p.project.title, projectHref: `/projects/${p.projectSlug}`, projectId: p.project.id,
      action: "postade en uppdatering",
      href: `/projects/${p.projectSlug}/updates`, date: p.createdAt,
    })),
    ...milestones.map((m) => ({
      id: `milestone-${m.id}`, targetType: "milestone", targetId: m.id,
      avatarName: m.createdBy.name, avatarImage: m.createdBy.image, projectImage: m.project.imageUrl,
      projectName: m.project.title, projectHref: `/projects/${m.project.slug}`, projectId: m.project.id,
      action: `Milstolpe klar: ${m.title}`,
      href: `/projects/${m.project.slug}/milestones`, date: m.updatedAt,
    })),
    ...projects.map((p) => ({
      id: `project-${p.id}`, targetType: "project", targetId: p.id,
      avatarName: p.owner.name, avatarImage: p.owner.image, projectImage: p.imageUrl,
      projectName: p.title, projectHref: `/projects/${p.slug}`, projectId: p.id,
      action: "Nytt projekt skapat",
      href: `/projects/${p.slug}`, date: p.createdAt,
    })),
    ...ideas.map((i) => ({
      id: `idea-${i.id}`, targetType: "idea", targetId: i.id,
      avatarName: i.author.name, avatarImage: i.author.image,
      projectName: "Idéer", projectHref: null, projectId: null,
      action: `Ny idé: ${i.title}`,
      href: `/ideas/${i.id}`, date: i.createdAt,
    })),
    ...activities.map((a) => ({
      id: `activity-${a.id}`, targetType: "activityEvent", targetId: a.id,
      avatarName: a.user.name, avatarImage: a.user.image, projectImage: a.project.imageUrl,
      projectName: a.project.title, projectHref: `/projects/${a.project.slug}`, projectId: a.project.id,
      action: activityLabel[a.type] ?? "aktivitet",
      href: `/projects/${a.project.slug}`, date: a.createdAt,
    })),
    ...channelMessages.map((m) => ({
      id: `msg-${m.id}`, targetType: "channelMessage", targetId: m.id,
      avatarName: m.author.name, avatarImage: m.author.image, projectImage: m.channel.project.imageUrl,
      projectName: m.channel.project.title, projectHref: `/projects/${m.channel.project.slug}`, projectId: m.channel.project.id,
      action: "skickade ett meddelande",
      href: `/projects/${m.channel.project.slug}`, date: m.createdAt,
    })),
    ...kanbanComments.map((c) => ({
      id: `kcomment-${c.id}`, targetType: "kanbanCardComment", targetId: c.id,
      avatarName: c.author.name, avatarImage: c.author.image, projectImage: c.card.project.imageUrl,
      projectName: c.card.project.title, projectHref: `/projects/${c.card.projectSlug}`, projectId: c.card.project.id,
      action: `kommenterade på "${c.card.title}"`,
      href: `/projects/${c.card.projectSlug}`, date: c.createdAt,
    })),
    ...ideaComments.map((c) => ({
      id: `icomment-${c.id}`, targetType: "ideaComment", targetId: c.id,
      avatarName: c.author.name, avatarImage: c.author.image,
      projectName: "Idéer", projectHref: null, projectId: null,
      action: `kommenterade på idén "${c.idea.title}"`,
      href: `/ideas/${c.idea.id}`, date: c.createdAt,
    })),
  ];

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
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
        const initials = item.avatarName
          ? item.avatarName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
          : "?";
        const iconImage = item.projectImage || item.avatarImage;
        const canJoin = isLoggedIn && !!item.projectId && !memberProjectIds.has(item.projectId);
        return (
          <div
            key={item.id}
            className="rounded-xl border border-muted-teal/40 bg-white p-3"
          >
            {/* Row 1 — project/function name + join link */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              {item.projectHref ? (
                <Link href={item.projectHref} className="text-xs font-semibold text-dark-slate hover:underline truncate">
                  {item.projectName}
                </Link>
              ) : (
                <p className="text-xs font-semibold text-dark-slate/60 truncate">{item.projectName}</p>
              )}
              {canJoin && item.projectHref && (
                <Link href={item.projectHref} className="text-xs text-seagrass hover:underline shrink-0">
                  Gå med →
                </Link>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate overflow-hidden relative shrink-0">
                {iconImage ? (
                  <Image src={iconImage} alt={item.avatarName ?? ""} fill className="object-cover" unoptimized />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                {/* Row 2 — author name + date */}
                <p className="text-xs text-dark-slate/70">
                  {item.avatarName ?? "Någon"} <span className="text-dark-slate/40">· {timeAgo(item.date)}</span>
                </p>
                {/* Row 3 — what happened + link */}
                {item.href ? (
                  <Link href={item.href} className="text-xs font-medium text-dark-slate leading-snug line-clamp-2 hover:underline">
                    {item.action}
                  </Link>
                ) : (
                  <p className="text-xs font-medium text-dark-slate leading-snug">{item.action}</p>
                )}
                {item.body && <p className="text-xs text-dark-slate/80 leading-snug mt-1">{item.body}</p>}
              </div>
            </div>
            {item.imageUrl && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden mt-2">
                <Image src={item.imageUrl} alt="" fill unoptimized className="object-cover" />
              </div>
            )}
            <FeedItemActions
              targetType={item.targetType}
              targetId={item.targetId}
              isLoggedIn={isLoggedIn}
              initialLikeCount={likeCountByTarget.get(key) ?? 0}
              initialLiked={likedByMe.has(key)}
              initialComments={commentsByTarget.get(key) ?? []}
            />
          </div>
        );
      })}
    </div>
  );
}
