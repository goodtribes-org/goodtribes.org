"use server";

import { auth } from "@/auth";
import { findOrCreateSkill, normalizeSkillNames, MAX_NEW_SKILLS_PER_SAVE } from "@/lib/skills";
import { prisma } from "@/lib/prisma"
import { recordHumanEdits } from "@/lib/fieldProvenance";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { indexDocuments } from "@/lib/meili";
import { hasProjectRole, isSiteAdmin, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isCommercialLegalType } from "@/lib/legalType";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { PROJECT_PHASE_LABEL, getNextPhase, isMoveBack, isValidProjectPhase, toDisplayPhase, type ProjectPhaseValue } from "@/lib/projectPhase";
import { notifyIdeaAuthor } from "@/lib/ideaOutcome";
import { parseProjectInput } from "@/lib/github";
import { syncProjectBoardInBackground } from "@/lib/githubSync";
import { isColumnKey } from "@/lib/kanbanColumns";
import { PROJECTS_LIST_TAG, invalidateListCache } from "@/lib/listCache";
import { syncProjectSearch } from "@/lib/projectTextSave";
import { logActivity } from "@/lib/activity";
import { enqueueProjectUpdatedFundingMatch } from "@/lib/fundingMatching";


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

  const slogan = (formData.get("slogan") as string | null)?.trim() || null;
  const summary = (formData.get("summary") as string | null)?.trim() || null;
  const descriptionRaw = (formData.get("description") as string | null)?.trim() || null;
  const description = descriptionRaw ? sanitizeHtml(descriptionRaw) : null;
  const category = (formData.get("category") as string | null)?.trim() || null;
  const tagsRaw = (formData.get("tags") as string | null)?.trim() || "";
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const sdgGoals = formData.getAll("sdgGoals").map(Number).filter((n) => n >= 1 && n <= 17);
  const imageUrl = (formData.get("imageUrl") as string | null)?.trim() || null;
  const orgId = (formData.get("orgId") as string | null)?.trim() || null;
  const skillIds = formData.getAll("skillIds") as string[];
  // Skills the project typed in itself ("Lägg till kompetens") — created in
  // the shared catalogue if they don't exist yet, then linked like the rest.
  const newSkillNames = normalizeSkillNames(formData.getAll("newSkillNames") as string[]).slice(0, MAX_NEW_SKILLS_PER_SAVE);

  await prisma.project.update({
    where: { slug },
    data: { title, slogan, summary, description, category, tags, sdgGoals, ...(imageUrl ? { imageUrl } : {}), orgId },
  });
  await recordHumanEdits(project.id, "project", project, { title, summary, description, category, tags, sdgGoals }, session.user.id);

  const createdSkills = await Promise.all(
    newSkillNames.map((name) => findOrCreateSkill({ name, tag: "övrigt", description: "" })),
  );
  const allSkillIds = [...new Set([...skillIds, ...createdSkills.map((s) => s.id)])];

  await prisma.$transaction([
    prisma.projectSkill.deleteMany({ where: { projectId: project.id } }),
    ...(allSkillIds.length > 0
      ? [prisma.projectSkill.createMany({
          data: allSkillIds.map((skillId) => ({ projectId: project.id, skillId })),
          skipDuplicates: true,
        })]
      : []),
  ]);

  await updateGithubMapping(slug, formData.get("githubProject") as string | null);

  syncProjectSearch({ slug, title, description, phase: project.phase, sdgGoals, hiddenAt: project.hiddenAt, publishedAt: project.publishedAt });

  invalidateListCache(PROJECTS_LIST_TAG);
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

  void enqueueProjectUpdatedFundingMatch(project.id);
  // #237: the author of the idea this project drives hears it moved on.
  void notifyIdeaAuthor(project.id, {
    type: "idea_project_phase",
    title: (p, idea) => `${p}, som driver din idé "${idea}", har gått vidare till ${PROJECT_PHASE_LABEL[toDisplayPhase(nextPhase)]}`,
  });

  // A draft (#226) stays out of search until it is published.
  if (!project.hiddenAt && project.publishedAt) {
    void indexDocuments("projects", [{
      id: `project-${slug}`,
      type: "project",
      title: project.title,
      description: project.description ?? "",
      url: `/projects/${slug}`,
      phase: nextPhase,
      sdgGoals: project.sdgGoals,
      locale: "sv",
    }]);
  }

  invalidateListCache(PROJECTS_LIST_TAG);
  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/projects/${slug}/edit`);
}

// A commercial, published project applies for invoicing (#226, what used
// to be "graduating out of Sandbox"). Lead-only. The Foundation decides and
// assigns a paraply-AB, see site-admin/invoicing/actions.ts. Nonprofit
// projects don't need this at all.
export async function requestInvoicing(slug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) redirect("/projects");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) redirect(`/projects/${slug}`);
  if (!isCommercialLegalType(project.legalType) || project.commercialUmbrellaEntityId || !project.publishedAt) return;

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
  const allowed =
    (await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)) ||
    (await isSiteAdmin(session.user.id));
  if (!allowed) redirect(`/projects/${slug}`);

  if (done) {
    await prisma.initiativeChecklistItem.upsert({
      where: { projectId_itemKey: { projectId: project.id, itemKey } },
      create: { projectId: project.id, phase, itemKey, completedAt: new Date(), completedById: session.user.id },
      update: { completedAt: new Date(), completedById: session.user.id },
    });
  } else {
    // Clears completion only (updateMany is a no-op if the row doesn't
    // exist) rather than deleting the row — it may now also carry a
    // startDate/dueDate (see the Roadmap page's Gantt chart), which
    // shouldn't be lost just because the step was unchecked.
    await prisma.initiativeChecklistItem.updateMany({
      where: { projectId: project.id, itemKey },
      data: { completedAt: null, completedById: null },
    });
  }

  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/projects/${slug}/edit`);
  revalidatePath(`/projects/${slug}/roadmap`);
}

export async function upsertChecklistItemDates(
  projectId: string,
  slug: string,
  phase: ProjectPhaseValue,
  itemKey: string,
  startDateRaw: string | null,
  dueDateRaw: string | null
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const allowed =
    (await hasProjectRole(projectId, session.user.id, PROJECT_LEAD_ROLES)) ||
    (await isSiteAdmin(session.user.id));
  if (!allowed) return;

  const startDate = startDateRaw ? new Date(startDateRaw) : null;
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

  await prisma.initiativeChecklistItem.upsert({
    where: { projectId_itemKey: { projectId, itemKey } },
    create: { projectId, phase, itemKey, startDate, dueDate },
    update: { startDate, dueDate },
  });

  revalidatePath(`/projects/${slug}/roadmap`);
}

// Starta om från en tidigare fas (#313): the one exception to "phases only go
// forward" (PRD 4d), for a team that starts over. A lead or site admin picks
// an earlier phase and says why; nothing is deleted — earlier decisions,
// ticks and documents stay, and the reopened gates only read decisions made
// after this (lib/phaseRestart.ts). Shown in the project's activity feed.
const MIN_RESTART_NOTE = 10;
const MAX_RESTART_NOTE = 1000;

export async function restartFromPhase(slug: string, toPhase: string, note: string): Promise<{ ok: true } | { error: "not_allowed" | "invalid_phase" | "note_required" }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "not_allowed" };
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) return { error: "not_allowed" };
  if (!(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES)) && !(await isSiteAdmin(userId))) return { error: "not_allowed" };
  if (!isValidProjectPhase(toPhase) || !isMoveBack(project.phase as ProjectPhaseValue, toPhase)) return { error: "invalid_phase" };
  const why = note.trim().slice(0, MAX_RESTART_NOTE);
  if (why.length < MIN_RESTART_NOTE) return { error: "note_required" };

  await prisma.$transaction([
    prisma.project.update({ where: { id: project.id }, data: { phase: toPhase, checklistDismissedAt: null, abandonedAt: null } }),
    prisma.phaseTransition.create({ data: { projectId: project.id, fromPhase: project.phase, toPhase, changedById: userId } }),
  ]);
  await logActivity(project.id, userId, "phase_restarted", { title: PROJECT_PHASE_LABEL[toDisplayPhase(toPhase)], description: why, fromPhase: project.phase, toPhase });
  syncProjectSearch({ slug, title: project.title, description: project.description, phase: toPhase, sdgGoals: project.sdgGoals, hiddenAt: project.hiddenAt, publishedAt: project.publishedAt });
  invalidateListCache(PROJECTS_LIST_TAG);
  revalidatePath(`/projects/${slug}`, "layout");
  return { ok: true };
}
