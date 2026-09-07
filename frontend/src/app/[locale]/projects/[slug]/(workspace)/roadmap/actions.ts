"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOwnerOrAdmin } from "@/lib/authz";
import type { ProjectPhase } from "@prisma/client";

export async function upsertPhaseTarget(
  projectId: string,
  slug: string,
  phase: ProjectPhase,
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await requireOwnerOrAdmin(projectId, session.user.id))) return;

  const startDateRaw = formData.get("startDate") as string | null;
  const targetDateRaw = formData.get("targetDate") as string | null;
  const startDate = startDateRaw ? new Date(startDateRaw) : null;
  const targetDate = targetDateRaw ? new Date(targetDateRaw) : null;

  await prisma.phaseTarget.upsert({
    where: { projectId_phase: { projectId, phase } },
    create: { projectId, phase, startDate, targetDate },
    update: { startDate, targetDate },
  });

  revalidatePath(`/projects/${slug}/roadmap`);
  revalidatePath(`/projects/${slug}`);
}
