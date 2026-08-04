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
