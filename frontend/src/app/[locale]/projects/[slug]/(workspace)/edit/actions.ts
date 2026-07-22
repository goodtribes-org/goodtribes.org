"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { indexDocuments, deleteDocument } from "@/lib/meili";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { getNextPhase } from "@/lib/projectPhase";


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

// Graduates a project out of Sandbox — no separate "lift" step exists
// (a sandbox project is already a real project), this just flips the flag
// so it appears in normal discovery instead of /sandbox. Lead-only,
// one-directional (no "un-graduate" — same trust level as advanceProjectPhase).
export async function toggleSandbox(slug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) redirect("/projects");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) redirect(`/projects/${slug}`);
  if (!project.isSandbox) return;

  await prisma.project.update({ where: { slug }, data: { isSandbox: false } });

  if (project.visibility === "public") {
    await indexDocuments("projects", [{
      id: `project-${slug}`,
      type: "project",
      title: project.title,
      description: project.description ?? "",
      url: `/projects/${slug}`,
      phase: project.phase,
      sdgGoals: project.sdgGoals,
    }]);
  }

  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/projects/${slug}/edit`);
  revalidatePath("/sandbox");
}

// Toggles a single IDEA/SPRINT checklist item (PRD 4d). Rows are created
// on demand — there's no pre-seeded row per item, so toggling "on" upserts
// and toggling "off" deletes.
export async function toggleChecklistItem(slug: string, phase: "IDEA" | "SPRINT", itemKey: string, done: boolean) {
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
