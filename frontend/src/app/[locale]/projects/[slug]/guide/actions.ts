"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { suggestSdgGoals } from "@/lib/claude";
import { isValidLegalType } from "@/lib/legalType";

// Idea-guide (PRD 4d/1.2): a skippable, step-by-step walkthrough of the
// `idea` phase's checklist, shown right after project creation. Each step
// marks its own IDEA checklist item done via the same InitiativeChecklistItem
// upsert toggleChecklistItem (see ../(workspace)/edit/actions.ts) uses.
async function requireLead(slug: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) redirect("/projects");
  if (!(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES))) redirect(`/projects/${slug}`);
  return project;
}

async function markChecklistDone(projectId: string, itemKey: string, userId: string) {
  await prisma.initiativeChecklistItem.upsert({
    where: { projectId_itemKey: { projectId, itemKey } },
    create: { projectId, phase: "IDEA", itemKey, completedAt: new Date(), completedById: userId },
    update: { completedAt: new Date(), completedById: userId },
  });
}

// Step 1 — Beskriv idén. Mirrors the questions from the standalone idea
// form (/ideas/new: separate problem/solution), stored on Project's single
// `description` column (Project has no dedicated problem/solution fields)
// as two clearly-labelled markdown sections.
export async function saveIdeaDescription(slug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await requireLead(slug, session.user.id);

  const summary = (formData.get("summary") as string | null)?.trim() || null;
  const problem = (formData.get("problem") as string | null)?.trim() || "";
  const solution = (formData.get("solution") as string | null)?.trim() || "";
  const legalTypeRaw = (formData.get("legalType") as string | null)?.trim() || "";

  const description = [
    problem && `**Problem:**\n${problem}`,
    solution && `**Lösning:**\n${solution}`,
  ].filter(Boolean).join("\n\n") || null;

  await prisma.project.update({
    where: { slug },
    data: {
      summary,
      description,
      ...(isValidLegalType(legalTypeRaw) ? { legalType: legalTypeRaw } : {}),
    },
  });
  await markChecklistDone(project.id, "dream_defined", session.user.id);
  revalidatePath(`/projects/${slug}`);
}

// Step 2 — Be AI granska idén.
export async function getIdeaAiReview(
  description: string
): Promise<{ goals: number[]; reasoning: string } | null> {
  return suggestSdgGoals(description);
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
