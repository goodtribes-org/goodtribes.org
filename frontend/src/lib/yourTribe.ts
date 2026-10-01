import { prisma } from "@/lib/prisma";
import { PROJECT_LEAD_ROLES } from "@/lib/authz";

// "Din tribe": a logged-in member's own start view on the start page — what's
// waiting for them, their projects and what others did there lately, and the
// thanks/kudos they got. "Lately" is a fixed window rather than "since your
// last visit": nothing records visits, and a window needs no new column or
// rule for when a visit counts.
export const RECENT_DAYS = 7;
const MAX_TASKS = 6;
const MAX_PROJECTS = 6;
const MAX_KUDOS = 3;

export async function getYourTribe(userId: string) {
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);
  const liveProject = { hiddenAt: null, archivedAt: null };

  const [memberships, tasks, unreadNotifications, kudos, kudosTotal, kudosRecent] = await Promise.all([
    prisma.projectMember.findMany({
      where: { userId, role: { not: "FOLLOWER" }, project: liveProject },
      select: { role: true, project: { select: { id: true, slug: true, title: true, phase: true, imageUrl: true, updatedAt: true } } },
      orderBy: { project: { updatedAt: "desc" } },
    }),
    // Tasks assigned to you and not done yet — soonest due first, undated last.
    prisma.kanbanCard.findMany({
      where: { assigneeId: userId, column: { not: "DONE" }, project: liveProject },
      select: { id: true, title: true, dueDate: true, column: true, project: { select: { slug: true, title: true } } },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      take: MAX_TASKS,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.kudos.findMany({
      where: { toUserId: userId },
      select: { id: true, message: true, createdAt: true, fromUser: { select: { name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: MAX_KUDOS,
    }),
    prisma.kudos.count({ where: { toUserId: userId } }),
    prisma.kudos.count({ where: { toUserId: userId, createdAt: { gte: since } } }),
  ]);

  const projects = memberships.slice(0, MAX_PROJECTS);
  const projectIds = projects.map((m) => m.project.id);
  const leadProjectIds = memberships.filter((m) => (PROJECT_LEAD_ROLES as string[]).includes(m.role)).map((m) => m.project.id);

  const [othersActivity, joinRequests] = await Promise.all([
    // What the others in each project did lately (your own events don't count).
    projectIds.length
      ? prisma.activityEvent.groupBy({
          by: ["projectId"],
          where: { projectId: { in: projectIds }, userId: { not: userId }, createdAt: { gte: since } },
          _count: true,
        })
      : Promise.resolve([]),
    // People asking to join a project you lead.
    leadProjectIds.length
      ? prisma.projectJoinRequest.findMany({
          where: { projectId: { in: leadProjectIds }, status: "pending" },
          select: { id: true, user: { select: { name: true } }, project: { select: { slug: true, title: true } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const activityByProject = new Map(othersActivity.map((g) => [g.projectId, g._count]));

  return {
    unreadNotifications,
    tasks,
    joinRequests,
    projects: projects.map((m) => ({
      ...m.project,
      isLead: (PROJECT_LEAD_ROLES as string[]).includes(m.role),
      recentByOthers: activityByProject.get(m.project.id) ?? 0,
    })),
    projectCount: memberships.length,
    kudos,
    kudosTotal,
    kudosRecent,
  };
}

export type YourTribeData = Awaited<ReturnType<typeof getYourTribe>>;
