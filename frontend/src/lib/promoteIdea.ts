import { prisma } from "@/lib/prisma";
import { createProjectRecord } from "@/lib/createProject";
import { createNotification } from "@/lib/notify";
import { isSiteAdmin } from "@/lib/authz";

// PRD 5.16 — stamps the permanent Idea<->Project back-link, carries the
// idea's contributors over as project members, and notifies them. Shared by
// both the one-click promote action and the manual /projects/new?from=
// form path so the two never drift apart. Best-effort/sequential, matching
// the existing Room-conversion precedent (Room.convertedToProjectId) — the
// project already exists by the time this runs, so there's nothing left to
// roll back if a later step fails.
export async function linkPromotedProject(ideaId: string, projectId: string, ownerId: string) {
  await prisma.idea
    .update({ where: { id: ideaId }, data: { promotedToProjectId: projectId, status: "converted" } })
    .catch(() => {});

  const contributors = await prisma.ideaContributor.findMany({
    where: { ideaId },
    select: { userId: true },
  });
  const memberIds = contributors.map((c) => c.userId).filter((id) => id !== ownerId);

  if (memberIds.length > 0) {
    await prisma.projectMember
      .createMany({
        data: memberIds.map((userId) => ({ projectId, userId, role: "MEMBER" as const })),
        skipDuplicates: true,
      })
      .catch(() => {});
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { slug: true, title: true } });
  await Promise.all(
    memberIds.map((userId) =>
      createNotification({
        userId,
        type: "idea_promoted",
        title: `An idea you contributed to became a project`,
        body: project?.title,
        url: project ? `/projects/${project.slug}` : undefined,
      }).catch(() => {})
    )
  );
}

// The one-click promotion path (PRD 5.16). Only the idea's author or a site
// admin may promote, and only once the idea has reached "approved" — same
// gate the existing (manual) convert-to-project CTA already used.
export async function promoteIdeaToProject(ideaId: string, actorId: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: {
      id: true, title: true, description: true, problem: true, solution: true,
      sdgGoals: true, category: true, tags: true, imageUrl: true,
      status: true, authorId: true, promotedToProjectId: true,
    },
  });
  if (!idea) throw new Error("Idea not found");
  if (idea.promotedToProjectId) throw new Error("Idea already promoted to a project");
  if (idea.status !== "approved") throw new Error("Idea must be approved before it can become a project");

  const authorized = actorId === idea.authorId || (await isSiteAdmin(actorId));
  if (!authorized) throw new Error("Not authorised");

  const description = [idea.description, idea.problem, idea.solution].filter(Boolean).join("\n\n") || null;

  const project = await createProjectRecord({
    title: idea.title,
    ownerId: idea.authorId,
    description,
    imageUrl: idea.imageUrl,
    category: idea.category,
    tags: idea.tags,
    sdgGoals: idea.sdgGoals,
  });

  await linkPromotedProject(idea.id, project.id, idea.authorId);

  return project;
}
