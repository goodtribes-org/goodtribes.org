"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { hasProjectRole, isExcludedFromProject, isSiteAdmin, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { publishToKanban } from "@/lib/redis";
import { moveKanbanCard } from "@/lib/kanbanMove";
import { toDisplayPhase, type ProjectPhaseValue } from "@/lib/projectPhase";
import { revisionFieldLabels } from "@/lib/projectRevisionLabels";
import { checkProposal, MAX_PENDING_PER_PROJECT, parseRevisionField, type RevisionTarget } from "@/lib/projectRevisions";
import { saveLeanCanvasField, saveProjectText } from "@/lib/projectTextSave";

// Föreslå en ändring (#290). Anyone logged in who isn't a lead proposes; a
// lead accepts (the field is written like their own edit) or declines. An
// accepted proposal can be credited with a card, paid through
// moveKanbanCard like every card — there is no other way to mint here.

type Result = { ok: true } | { error: string };

const MAX_REASON = 1_000;

async function sessionUser() {
  const session = await auth();
  return session?.user?.id ? { id: session.user.id, name: session.user.name ?? null } : null;
}

async function projectForRevision(where: { slug: string } | { id: string }) {
  return prisma.project.findUnique({
    where,
    select: {
      id: true, slug: true, title: true, phase: true, publishedAt: true, hiddenAt: true, summary: true, description: true,
      leanCanvas: true,
      members: { where: { role: { in: PROJECT_LEAD_ROLES } }, select: { userId: true } },
    },
  });
}

type RevisionProject = NonNullable<Awaited<ReturnType<typeof projectForRevision>>>;

function currentValue(project: RevisionProject, target: RevisionTarget): string | null {
  if (target.entity === "project") return project[target.key];
  return (project.leanCanvas?.[target.key] as string | null | undefined) ?? null;
}

async function fieldLabel(field: string): Promise<string> {
  return (await revisionFieldLabels(await getLocale()))(field);
}

export async function proposeRevision(slug: string, field: string, value: unknown, reason: unknown): Promise<Result> {
  const user = await sessionUser();
  if (!user) return { error: "not_logged_in" };
  const target = parseRevisionField(field);
  if (!target || typeof value !== "string") return { error: "invalid" };
  const project = await projectForRevision({ slug });
  if (!project || !project.publishedAt || project.hiddenAt) return { error: "not_found" };
  // Leads edit directly; someone banned from the project doesn't propose.
  if (await hasProjectRole(project.id, user.id, PROJECT_LEAD_ROLES)) return { error: "is_lead" };
  if (await isExcludedFromProject(user.id, project.id)) return { error: "not_allowed" };
  const pending = await prisma.projectRevision.count({ where: { projectId: project.id, authorId: user.id, status: "PENDING" } });
  if (pending >= MAX_PENDING_PER_PROJECT) return { error: "too_many" };

  const current = currentValue(project, target);
  const check = checkProposal(target, value, current);
  if (!check.ok) return { error: check.error };
  const why = typeof reason === "string" && reason.trim() ? reason.trim().slice(0, MAX_REASON) : null;

  await prisma.projectRevision.create({
    data: { projectId: project.id, authorId: user.id, field, baseValue: current, proposedValue: check.value, reason: why },
  });

  const t = await getTranslations("ProjectRevisions");
  const label = await fieldLabel(field);
  await Promise.all(
    project.members.map((m) =>
      createNotification({
        userId: m.userId,
        type: "project_revision",
        title: t("notifyNew", { name: user.name ?? t("someone"), field: label, project: project.title }),
        body: why ?? undefined,
        url: `/projects/${project.slug}/changes`,
      }),
    ),
  );
  revalidatePath(`/projects/${project.slug}/changes`);
  return { ok: true };
}

async function revisionForLead(revisionId: string, userId: string) {
  const revision = await prisma.projectRevision.findUnique({ where: { id: revisionId } });
  if (!revision || revision.status !== "PENDING") return null;
  const project = await projectForRevision({ id: revision.projectId });
  // Site admins get a founder's controls here too (requireProjectRole's allowSiteAdmin precedent).
  if (!project || !((await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES)) || (await isSiteAdmin(userId)))) return null;
  return { revision, project };
}

export async function acceptRevision(revisionId: string, note: unknown, credit: boolean): Promise<Result> {
  const user = await sessionUser();
  if (!user) return { error: "not_logged_in" };
  const found = await revisionForLead(revisionId, user.id);
  if (!found) return { error: "not_allowed" };
  const { revision, project } = found;
  const target = parseRevisionField(revision.field);
  if (!target) return { error: "invalid" };

  // Claim it first, so two leads accepting at once can't both write.
  const claimed = await prisma.projectRevision.updateMany({
    where: { id: revision.id, status: "PENDING" },
    data: { status: "ACCEPTED", decidedById: user.id, decidedAt: new Date(), decisionNote: typeof note === "string" && note.trim() ? note.trim().slice(0, MAX_REASON) : null },
  });
  if (claimed.count === 0) return { error: "already_decided" };

  if (target.entity === "project") await saveProjectText(project.id, target.key, revision.proposedValue, user.id);
  else await saveLeanCanvasField(project.slug, project.id, target.key, revision.proposedValue, user.id);

  const t = await getTranslations("ProjectRevisions");
  const label = await fieldLabel(revision.field);

  if (credit) {
    // The proposer wrote the improvement and did it: creator and assignee.
    // The lead approves by moving it to Done, which pays out as for any card.
    const card = await prisma.kanbanCard.create({
      data: {
        projectSlug: project.slug,
        title: t("cardTitle", { field: label }),
        description: revision.reason ?? null,
        column: "REVIEW",
        createdById: revision.authorId,
        assigneeId: revision.authorId,
        phase: toDisplayPhase(project.phase as ProjectPhaseValue),
      },
    });
    publishToKanban(project.slug, { action: "created", card });
    await prisma.projectRevision.update({ where: { id: revision.id }, data: { cardId: card.id } });
    await moveKanbanCard(card.id, "DONE", user.id);
  }

  await createNotification({
    userId: revision.authorId,
    type: "project_revision_accepted",
    title: t("notifyAccepted", { field: label, project: project.title }),
    url: `/projects/${project.slug}/changes`,
  });
  revalidatePath(`/projects/${project.slug}`, "layout");
  return { ok: true };
}

export async function declineRevision(revisionId: string, note: unknown): Promise<Result> {
  const user = await sessionUser();
  if (!user) return { error: "not_logged_in" };
  const found = await revisionForLead(revisionId, user.id);
  if (!found) return { error: "not_allowed" };
  const { revision, project } = found;
  const why = typeof note === "string" && note.trim() ? note.trim().slice(0, MAX_REASON) : null;
  const claimed = await prisma.projectRevision.updateMany({
    where: { id: revision.id, status: "PENDING" },
    data: { status: "DECLINED", decidedById: user.id, decidedAt: new Date(), decisionNote: why },
  });
  if (claimed.count === 0) return { error: "already_decided" };

  const t = await getTranslations("ProjectRevisions");
  await createNotification({
    userId: revision.authorId,
    type: "project_revision_declined",
    title: t("notifyDeclined", { field: await fieldLabel(revision.field), project: project.title }),
    body: why ?? undefined,
    url: `/projects/${project.slug}/changes`,
  });
  revalidatePath(`/projects/${project.slug}/changes`);
  return { ok: true };
}
