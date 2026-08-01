"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { indexDocuments, deleteDocument } from "@/lib/meili";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { getNextPhase, type ProjectPhaseValue } from "@/lib/projectPhase";
import { parseRepoInput } from "@/lib/github";
import { syncProjectRepoInBackground } from "@/lib/githubSync";


/**
 * Apply the GitHub repo field. Callers must already have verified project lead.
 *
 * Clearing the field, or pointing at a different repo, drops the cards that were
 * mirrored from the old repo. Only source="github" rows are ever deleted —
 * manually created cards are never touched.
 */
async function updateGithubMapping(slug: string, raw: string | null) {
  const ref = parseRepoInput(raw);
  const current = await prisma.projectGithubRepo.findUnique({ where: { projectSlug: slug } });

  if (!ref) {
    if (current) {
      await prisma.projectGithubRepo.delete({ where: { projectSlug: slug } });
      await prisma.kanbanCard.deleteMany({ where: { projectSlug: slug, source: "github" } });
    }
    return;
  }

  if (current && current.owner === ref.owner && current.repo === ref.repo) return;

  if (current) {
    await prisma.kanbanCard.deleteMany({ where: { projectSlug: slug, source: "github" } });
  }

  const repoRow = await prisma.projectGithubRepo.upsert({
    where: { projectSlug: slug },
    create: { projectSlug: slug, owner: ref.owner, repo: ref.repo },
    update: {
      owner: ref.owner,
      repo: ref.repo,
      lastSyncedAt: null,
      lastFullSyncAt: null,
      lastSyncError: null,
    },
  });

  syncProjectRepoInBackground(repoRow);
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
  const visibility = (formData.get("visibility") as string) || "public";
  const category = (formData.get("category") as string | null)?.trim() || null;
  const tagsRaw = (formData.get("tags") as string | null)?.trim() || "";
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const sdgGoals = formData.getAll("sdgGoals").map(Number).filter((n) => n >= 1 && n <= 17);
  const imageUrl = (formData.get("imageUrl") as string | null)?.trim() || null;
  const orgId = (formData.get("orgId") as string | null)?.trim() || null;
  const skillIds = formData.getAll("skillIds") as string[];

  await prisma.project.update({
    where: { slug },
    data: { title, summary, description, visibility, category, tags, sdgGoals, ...(imageUrl ? { imageUrl } : {}), orgId },
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

  await updateGithubMapping(slug, formData.get("githubRepo") as string | null);

  // Sync Meilisearch — remove old slug entry if slug changed (slug doesn't change here, but keep in sync)
  if (visibility === "public") {
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

  if (project.visibility === "public") {
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

export async function deleteProject(slug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) redirect("/projects");
  if (!(await hasProjectRole(project.id, session.user.id, ["FOUNDER"]))) redirect(`/projects/${slug}`);

  await prisma.project.delete({ where: { slug } });
  await deleteDocument("projects", `project-${slug}`);

  redirect("/projects");
}
