import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";

// How long the idea author's invitation into a project that drives their
// idea stays open. Longer than a normal invite (7 days): they didn't ask.
const AUTHOR_INVITE_DAYS = 30;

// #233: anyone can drive any open idea, and one idea can have many
// projects. Links a new project to the idea it drives, and tells the
// idea's author and contributors. The author gets an invitation to join as
// an adviser, which they can ignore — they can't say no to the project
// itself. Nobody is added to the project without accepting.
//
// Best-effort and sequential, like the room-conversion precedent: the
// project already exists by the time this runs, so a failed step only
// means a missing link or notice, never a broken project.
export async function linkProjectToIdea(ideaId: string, projectId: string, ownerId: string) {
  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, hiddenAt: null, status: "open" },
    select: {
      id: true, title: true, authorId: true, author: { select: { email: true } },
      challenge: { select: { slug: true, title: true, organisationId: true } },
    },
  });
  if (!idea) return;

  const project = await prisma.project
    .update({ where: { id: projectId }, data: { basedOnIdeaId: idea.id }, select: { slug: true, title: true } })
    .catch(() => null);
  if (!project) return;
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { name: true } });
  const who = owner?.name ?? "Någon";

  if (idea.authorId !== ownerId) {
    // An invite tied to the author's address (acceptInvite checks it).
    const invite = idea.author.email
      ? await prisma.projectInvite
          .create({
            data: {
              projectId,
              email: idea.author.email,
              createdById: ownerId,
              expiresAt: new Date(Date.now() + AUTHOR_INVITE_DAYS * 24 * 60 * 60 * 1000),
            },
          })
          .catch(() => null)
      : null;
    await createNotification({
      userId: idea.authorId,
      type: "idea_driven",
      title: `${who} driver nu din idé "${idea.title}"`,
      body: invite
        ? `Projektet heter ${project.title}. Du är välkommen in som rådgivare om du vill.`
        : `Projektet heter ${project.title}.`,
      url: invite ? `/invite/${invite.token}` : `/projects/${project.slug}`,
    }).catch(() => {});
  }

  const contributors = await prisma.ideaContributor.findMany({ where: { ideaId }, select: { userId: true } });
  const others = [...new Set(contributors.map((c) => c.userId))].filter((id) => id !== ownerId && id !== idea.authorId);
  await Promise.all(
    others.map((userId) =>
      createNotification({
        userId,
        type: "idea_driven",
        title: `En idé du bidragit till drivs nu av ${who}`,
        body: project.title,
        url: `/projects/${project.slug}`,
      }).catch(() => {}),
    ),
  );

  // #235: everyone who said "Jag vill hjälpa till" hears the idea got
  // going and can ask to join the project from its page.
  const helpers = await prisma.ideaEndorsement.findMany({ where: { ideaId }, select: { userId: true } });
  const told = new Set([ownerId, idea.authorId, ...others]);
  await Promise.all(
    helpers
      .filter((h) => !told.has(h.userId))
      .map((h) =>
        createNotification({
          userId: h.userId,
          type: "idea_driven",
          title: `${who} har startat ett projekt av idén du vill hjälpa till med`,
          body: project.title,
          url: `/projects/${project.slug}`,
        }).catch(() => {}),
      ),
  );

  // #228: an answer to a challenge got going — its organisation's owners
  // and admins hear it, since they may have support to offer.
  if (idea.challenge) {
    const leads = await prisma.organisationMember.findMany({
      where: { organisationId: idea.challenge.organisationId, role: { in: ["OWNER", "ADMIN"] } },
      select: { userId: true },
    });
    const challengeTitle = idea.challenge.title;
    await Promise.all(
      leads
        .filter((l) => l.userId !== ownerId)
        .map((l) =>
          createNotification({
            userId: l.userId,
            type: "challenge_idea_driven",
            title: `${who} driver en idé från er utmaning "${challengeTitle}"`,
            body: project.title,
            url: `/projects/${project.slug}`,
          }).catch(() => {}),
        ),
    );
  }
}
