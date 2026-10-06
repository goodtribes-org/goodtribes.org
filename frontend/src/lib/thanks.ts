import { PUBLIC_PROJECT_WHERE } from "@/lib/projectVisibility";
import { prisma } from "@/lib/prisma";

// "♥ Tacka": a one-click thank-you for something in the feed. It is stored as
// a Kudos (prisma/schema/community.prisma) tied to the feed item through
// targetType/targetId, so it shows up and counts with every other kudos.
// Everything here works from the item and resolves the person and context
// server-side, so a client can never choose who gets thanked.

export const THANKABLE_TYPES = ["project", "idea", "milestone", "blogPost", "activityEvent"] as const;
export type ThankableType = (typeof THANKABLE_TYPES)[number];

export function isThankableType(t: string): t is ThankableType {
  return (THANKABLE_TYPES as readonly string[]).includes(t);
}

// Who did it, where it lives, and what it was — `kind` picks the sentence for
// the kudos message and notification, the rest fills it in.
export type ThanksTarget = {
  recipientId: string;
  href: string;
  projectId: string | null;
  kind: "startedProject" | "sharedIdea" | "reachedMilestone" | "wroteBlogPost" | "completedTask" | "joinedProject" | "contributed";
  project?: string;
  title?: string;
};

export async function resolveThanksTarget(targetType: ThankableType, targetId: string): Promise<ThanksTarget | null> {
  switch (targetType) {
    case "project": {
      const p = await prisma.project.findFirst({ where: { id: targetId, ...PUBLIC_PROJECT_WHERE }, select: { id: true, ownerId: true, slug: true, title: true } });
      return p && { recipientId: p.ownerId, href: `/projects/${p.slug}`, projectId: p.id, kind: "startedProject", project: p.title };
    }
    case "idea": {
      const i = await prisma.idea.findUnique({ where: { id: targetId }, select: { authorId: true, title: true } });
      return i && { recipientId: i.authorId, href: `/ideas/${targetId}`, projectId: null, kind: "sharedIdea", title: i.title };
    }
    case "milestone": {
      const m = await prisma.milestone.findUnique({
        where: { id: targetId },
        select: { createdById: true, title: true, project: { select: { id: true, slug: true, title: true, hiddenAt: true } } },
      });
      if (!m || m.project.hiddenAt) return null;
      return {
        recipientId: m.createdById, href: `/projects/${m.project.slug}/calendar#milestone-${targetId}`,
        projectId: m.project.id, kind: "reachedMilestone", project: m.project.title, title: m.title,
      };
    }
    case "blogPost": {
      const b = await prisma.blogPost.findUnique({
        where: { id: targetId },
        select: { authorId: true, title: true, projectSlug: true, project: { select: { id: true, title: true, hiddenAt: true } } },
      });
      if (!b || b.project?.hiddenAt) return null;
      return {
        recipientId: b.authorId, href: `/projects/${b.projectSlug}/updates#post-${targetId}`,
        projectId: b.project?.id ?? null, kind: "wroteBlogPost", project: b.project?.title, title: b.title,
      };
    }
    case "activityEvent": {
      const a = await prisma.activityEvent.findUnique({
        where: { id: targetId },
        select: { userId: true, type: true, payload: true, project: { select: { id: true, slug: true, title: true, hiddenAt: true } } },
      });
      if (!a || !a.project || a.project.hiddenAt) return null;
      const title = (a.payload as { title?: string } | null)?.title;
      const kind = a.type === "task_completed" && title ? "completedTask" : a.type === "member_joined" ? "joinedProject" : "contributed";
      return { recipientId: a.userId, href: `/projects/${a.project.slug}`, projectId: a.project.id, kind, project: a.project.title, title };
    }
  }
}

// Thanks per feed item, and which of them the viewer has already thanked —
// for the "♥ Tacka" buttons on a list of items. Keys are `${type}:${id}`.
export async function getThanksState(items: { targetType: string; targetId: string }[], viewerId: string | null) {
  const counts = new Map<string, number>();
  const thanked = new Set<string>();
  const relevant = items.filter((t) => isThankableType(t.targetType));
  if (relevant.length === 0) return { counts, thanked };

  const or = relevant.map((t) => ({ targetType: t.targetType, targetId: t.targetId }));
  const [groups, mine] = await Promise.all([
    prisma.kudos.groupBy({ by: ["targetType", "targetId"], where: { OR: or }, _count: true }),
    viewerId
      ? prisma.kudos.findMany({ where: { fromUserId: viewerId, OR: or }, select: { targetType: true, targetId: true } })
      : Promise.resolve([]),
  ]);
  for (const g of groups) counts.set(`${g.targetType}:${g.targetId}`, g._count);
  for (const m of mine) thanked.add(`${m.targetType}:${m.targetId}`);
  return { counts, thanked };
}
