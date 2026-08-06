"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES, isSiteAdmin } from "@/lib/authz";
import { closeAndAdvancePhase, DEFAULT_PHASE_DAYS } from "@/lib/sprints";
import type { SprintPace } from "@prisma/client";

export async function createSprint(
  projectSlug: string,
  name: string,
  pace: SprintPace,
  phaseDurationDays?: number
) {
  const locale = await getLocale();
  const session = await auth();
  if (!session?.user?.id) { redirect({ href: "/login", locale }); return; }

  const project = await prisma.project.findUnique({ where: { slug: projectSlug } });
  if (!project) { redirect({ href: "/projects", locale }); return; }
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) {
    redirect({ href: `/projects/${projectSlug}/sprints`, locale });
    return;
  }

  const trimmedName = name.trim();
  if (!trimmedName) return;

  const deadlineAt =
    pace === "SPREAD_OUT"
      ? new Date(Date.now() + (phaseDurationDays ?? DEFAULT_PHASE_DAYS) * 24 * 60 * 60 * 1000)
      : null;

  const sprint = await prisma.sprint.create({
    data: {
      projectSlug,
      createdById: session.user.id,
      name: trimmedName,
      pace,
      phaseDurationDays: pace === "SPREAD_OUT" ? phaseDurationDays ?? null : null,
      phases: {
        create: { phase: "UNDERSTAND", status: "OPEN", openedAt: new Date(), deadlineAt },
      },
    },
  });

  revalidatePath(`/projects/${projectSlug}/sprints`);
  redirect({ href: `/projects/${projectSlug}/sprints/${sprint.id}`, locale });
}

export async function pauseSprint(projectSlug: string, sprintId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const project = await prisma.project.findUnique({ where: { slug: projectSlug } });
  if (!project || !(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) {
    return { error: "Not authorized" };
  }

  await prisma.sprint.update({ where: { id: sprintId }, data: { status: "PAUSED" } });
  revalidatePath(`/projects/${projectSlug}/sprints/${sprintId}`);
  return { success: true };
}

export async function resumeSprint(projectSlug: string, sprintId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const project = await prisma.project.findUnique({ where: { slug: projectSlug } });
  if (!project || !(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) {
    return { error: "Not authorized" };
  }

  await prisma.sprint.update({ where: { id: sprintId }, data: { status: "ACTIVE" } });
  revalidatePath(`/projects/${projectSlug}/sprints/${sprintId}`);
  return { success: true };
}

// Manual close-current/open-next — the only way a TOGETHER-paced sprint's
// phases move forward (no deadline), also usable to push a SPREAD_OUT
// sprint ahead of its deadline. Lead-gated: advancing affects every
// participant, so it's not a self-serve per-member action.
export async function advancePhase(projectSlug: string, sprintId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const project = await prisma.project.findUnique({ where: { slug: projectSlug } });
  if (!project || !(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) {
    return { error: "Not authorized" };
  }

  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId }, include: { phases: true } });
  if (!sprint) return { error: "Sprint not found" };

  const openPhase = sprint.phases.find((p) => p.status === "OPEN");
  if (!openPhase) return { error: "No open phase" };

  await closeAndAdvancePhase(openPhase.id);
  revalidatePath(`/projects/${projectSlug}/sprints/${sprintId}`);
  return { success: true };
}

// Hard delete — cascades to every phase, contribution, vote and comment on
// this sprint (see onDelete: Cascade on those relations). Lead or
// site-admin only; no soft-delete flag, this is permanent.
export async function deleteSprint(projectSlug: string, sprintId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const project = await prisma.project.findUnique({ where: { slug: projectSlug } });
  if (!project) return { error: "Project not found" };

  const allowed =
    (await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)) ||
    (await isSiteAdmin(session.user.id));
  if (!allowed) return { error: "Not authorized" };

  await prisma.sprint.delete({ where: { id: sprintId } });
  revalidatePath(`/projects/${projectSlug}/sprints`);
  return { success: true };
}
