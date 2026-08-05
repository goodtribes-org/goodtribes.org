"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";

// Idea-guide (PRD 4d/1.2): a skippable, step-by-step walkthrough of the
// `idea` phase's checklist, shown right after project creation (its first
// step, "Beskriv projektet"/dream_defined, actually runs on /projects/new —
// see its createProject action — since it both creates the Project and
// saves its description in one go). Each remaining step marks its own IDEA
// checklist item done via the same InitiativeChecklistItem upsert
// toggleChecklistItem (see ../(workspace)/edit/actions.ts) uses.
async function requireLead(slug: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) redirect("/projects");
  if (!(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES))) redirect(`/projects/${slug}`);
  return project;
}

export async function markChecklistDone(projectId: string, itemKey: string, userId: string) {
  await prisma.initiativeChecklistItem.upsert({
    where: { projectId_itemKey: { projectId, itemKey } },
    create: { projectId, phase: "IDEA", itemKey, completedAt: new Date(), completedById: userId },
    update: { completedAt: new Date(), completedById: userId },
  });
}

// Step 1 ("Beskriv projektet") re-visited from later in the guide — a
// narrow, safe partial update covering only the fields that step shows.
// Deliberately does NOT reuse (workspace)/edit's updateProject: that action
// defaults visibility to "public" and wipes projectSkills/orgId when those
// fields are absent from the FormData, which would silently destroy data
// for a form that only ever collects title/summary/description/category/
// tags/imageUrl. legalType isn't editable here either — once a project
// exists, changing it is a member-voted LegalTypeChangeRequest (PRD 4c),
// not a casual guide edit.
export async function updateIdeaDetails(
  slug: string,
  data: { title: string; summary: string; description: string; category: string; tags: string[]; imageUrl: string }
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await requireLead(slug, session.user.id);

  const title = data.title.trim();
  if (!title) return;

  await prisma.project.update({
    where: { slug },
    data: {
      title,
      summary: data.summary.trim() || null,
      description: data.description.trim() || null,
      category: data.category.trim() || null,
      tags: data.tags,
      ...(data.imageUrl.trim() ? { imageUrl: data.imageUrl.trim() } : {}),
    },
  });
  // Defensive re-mark — already set when the project was first created via
  // /projects/new, but this keeps it true even for a project that reached
  // this guide some other way.
  await markChecklistDone(project.id, "dream_defined", session.user.id);
  revalidatePath(`/projects/${slug}`);
}

// Marks a single idea-phase checklist item done, optionally saving the
// selected SDG goals (step 2). Steps 3 (peer feedback) and 4 (Lean Canvas)
// call this with no sdgGoals — their real work (sending an invite, creating
// a canvas) happens elsewhere, this just records that the step was visited,
// same self-declared trust level as every other item in the checklist.
export async function completeIdeaGuideStep(slug: string, itemKey: string, sdgGoals?: number[]) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await requireLead(slug, session.user.id);

  if (sdgGoals) {
    await prisma.project.update({ where: { slug }, data: { sdgGoals } });
  }
  await markChecklistDone(project.id, itemKey, session.user.id);
  revalidatePath(`/projects/${slug}`);
}
