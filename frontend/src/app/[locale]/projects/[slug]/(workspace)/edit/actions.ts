"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { indexDocuments, deleteDocument } from "@/lib/meili";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { getNextPhase, type ProjectPhaseValue } from "@/lib/projectPhase";
import { parseProjectInput } from "@/lib/github";
import { syncProjectBoardInBackground } from "@/lib/githubSync";
import { isColumnKey } from "@/lib/kanbanColumns";


/**
 * Apply the GitHub project-board field. Callers must already have verified
 * project lead.
 *
 * Clearing the field, or pointing at a different board, drops the cards that
 * were mirrored from the old one. Only source="github" rows are ever deleted —
 * manually created cards are never touched.
 */
async function updateGithubMapping(slug: string, raw: string | null) {
  const ref = parseProjectInput(raw);
  const current = await prisma.projectGithubBoard.findUnique({ where: { projectSlug: slug } });

  if (!ref) {
    if (current) {
      await prisma.projectGithubBoard.delete({ where: { projectSlug: slug } });
      await prisma.kanbanCard.deleteMany({ where: { projectSlug: slug, source: "github" } });
    }
    return;
  }

  if (
    current &&
    current.ownerLogin === ref.ownerLogin &&
    current.projectNumber === ref.projectNumber
  ) {
    return;
  }

  if (current) {
    await prisma.kanbanCard.deleteMany({ where: { projectSlug: slug, source: "github" } });
  }

  const boardRow = await prisma.projectGithubBoard.upsert({
    where: { projectSlug: slug },
    create: {
      projectSlug: slug,
      ownerLogin: ref.ownerLogin,
      ownerType: ref.ownerType,
      projectNumber: ref.projectNumber,
    },
    update: {
      ownerLogin: ref.ownerLogin,
      ownerType: ref.ownerType,
      projectNumber: ref.projectNumber,
      // A different board means a different status vocabulary, so the old
      // per-status overrides no longer apply.
      columnMap: {},
      statusOptions: [],
      projectNodeId: null,
      projectTitle: null,
      projectUrl: null,
      lastSyncedAt: null,
      lastSyncError: null,
    },
  });

  syncProjectBoardInBackground(boardRow);
}

/**
 * Save the per-status → column overrides for a project's mirrored board.
 *
 * Form fields are named `columnMap:<status name>`; a pick equal to the built-in
 * default is stored anyway, so the mapping stays stable if the defaults ever
 * change under a project that had already chosen.
 */
export async function updateGithubColumnMap(slug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) redirect("/projects");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) {
    redirect(`/projects/${slug}`);
  }

  const board = await prisma.projectGithubBoard.findUnique({ where: { projectSlug: slug } });
  if (!board) return;

  const columnMap: Record<string, string> = {};
  for (const [field, value] of formData.entries()) {
    if (!field.startsWith("columnMap:")) continue;
    const status = field.slice("columnMap:".length).trim();
    if (status && isColumnKey(value)) columnMap[status] = value;
  }

  const updated = await prisma.projectGithubBoard.update({
    where: { projectSlug: slug },
    data: { columnMap },
  });

  syncProjectBoardInBackground(updated);
  revalidatePath(`/projects/${slug}/edit`);
  revalidatePath(`/projects/${slug}/tasks`);
}

export async function updateProject(slug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) redirect("/projects");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) redirect(`/projects/${slug}`);

  const title = (formData.get("title") as string).trim();
  if (!title) return;

  const summary = (formData.get("summary") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const category = (formData.get("category") as string | null)?.trim() || null;
  const tagsRaw = (formData.get("tags") as string | null)?.trim() || "";
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const sdgGoals = formData.getAll("sdgGoals").map(Number).filter((n) => n >= 1 && n <= 17);
  const imageUrl = (formData.get("imageUrl") as string | null)?.trim() || null;
  const orgId = (formData.get("orgId") as string | null)?.trim() || null;
  const skillIds = formData.getAll("skillIds") as string[];

  await prisma.project.update({
    where: { slug },
    data: { title, summary, description, category, tags, sdgGoals, ...(imageUrl ? { imageUrl } : {}), orgId },
  });

  await prisma.$transaction([
    prisma.projectSkill.deleteMany({ where: { projectId: project.id } }),
    ...(skillIds.length > 0
      ? [prisma.projectSkill.createMany({
          data: skillIds.map((skillId) => ({ projectId: project.id, skillId })),
          skipDuplicates: true,
        })]
      : []),
  ]);

  await updateGithubMapping(slug, formData.get("githubProject") as string | null);

  // Sync Meilisearch — remove old slug entry if slug changed (slug doesn't change here, but keep in sync)
  if (!project.hiddenAt) {
    await indexDocuments("projects", [{
      id: `project-${slug}`,
      type: "project",
      title,
      description: description ?? "",
      url: `/projects/${slug}`,
      phase: project.phase,
      sdgGoals,
    }]);
  } else {
    await deleteDocument("projects", `project-${slug}`);
  }

  revalidatePath(`/projects/${slug}`);
  redirect(`/projects/${slug}`);
}

// Advances a project to the immediately-next lifecycle phase (PRD 4d:
// "Övergångar sker endast framåt"). No automatic gating is enforced yet —
// several transition conditions are still explicitly undecided in the PRD —
// so this is a manual, lead-only action, same trust level as the old status
// dropdown it replaces.
export async function advanceProjectPhase(slug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) redirect("/projects");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) redirect(`/projects/${slug}`);

  const nextPhase = getNextPhase(project.phase);
  if (!nextPhase) {
    revalidatePath(`/projects/${slug}/edit`);
    return;
  }

  await prisma.$transaction([
    prisma.project.update({ where: { slug }, data: { phase: nextPhase, checklistDismissedAt: null } }),
    prisma.phaseTransition.create({
      data: {
        projectId: project.id,
        fromPhase: project.phase,
        toPhase: nextPhase,
        changedById: session.user.id,
      },
    }),
  ]);

  if (!project.hiddenAt) {
    await indexDocuments("projects", [{
      id: `project-${slug}`,
      type: "project",
      title: project.title,
      description: project.description ?? "",
      url: `/projects/${slug}`,
      phase: nextPhase,
      sdgGoals: project.sdgGoals,
    }]);
  }

  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/projects/${slug}/edit`);
}

// Applies to graduate a project out of Sandbox into a "GoodTribes-godkänt
// projekt" — no separate "lift" step exists (a sandbox project is already a
// real project), this just requests the flag flip. Lead-only. Decided by the
// Foundation (site-admin), see site-admin/sandbox-graduation/actions.ts —
// replaces the old one-click self-serve toggleSandbox.
export async function requestSandboxGraduation(slug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) redirect("/projects");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) redirect(`/projects/${slug}`);
  if (!project.isSandbox) return;

  const existingPending = await prisma.sandboxGraduationRequest.findFirst({
    where: { projectId: project.id, status: "pending" },
  });
  if (existingPending) return;

  await prisma.sandboxGraduationRequest.create({
    data: { projectId: project.id, requestedById: session.user.id },
  });

  revalidatePath(`/projects/${slug}/edit`);
}

// Toggles a single checklist item within any phase (PRD 4d). Rows are
// created on demand — there's no pre-seeded row per item, so toggling "on"
// upserts and toggling "off" deletes.
export async function toggleChecklistItem(slug: string, phase: ProjectPhaseValue, itemKey: string, done: boolean) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) redirect("/projects");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) redirect(`/projects/${slug}`);

  if (done) {
    await prisma.initiativeChecklistItem.upsert({
      where: { projectId_itemKey: { projectId: project.id, itemKey } },
      create: { projectId: project.id, phase, itemKey, completedAt: new Date(), completedById: session.user.id },
      update: { completedAt: new Date(), completedById: session.user.id },
    });
  } else {
    await prisma.initiativeChecklistItem.deleteMany({ where: { projectId: project.id, itemKey } });
  }

  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/projects/${slug}/edit`);
}
