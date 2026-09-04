"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import type { NextStepDecision } from "@prisma/client";

const VALID_DECISIONS: NextStepDecision[] = ["UNDECIDED", "CONTINUE", "REPLICATE", "CLOSE_RESPONSIBLY"];

export async function updateImpactFollowup(projectSlug: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return;
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return;

  const field = (name: string) => (formData.get(name) as string | null)?.trim() || null;
  const rawDecision = formData.get("nextStepDecision") as string | null;
  const nextStepDecision: NextStepDecision = VALID_DECISIONS.includes(rawDecision as NextStepDecision)
    ? (rawDecision as NextStepDecision)
    : "UNDECIDED";

  const data = {
    externalVerificationNotes: field("externalVerificationNotes"),
    celebrationNotes: field("celebrationNotes"),
    nextStepDecision,
    updatedById: session.user.id,
  };

  await prisma.impactFollowup.upsert({
    where: { projectSlug },
    create: { projectSlug, ...data },
    update: data,
  });

  revalidatePath(`/projects/${projectSlug}/impact-followup`);
}
