"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import type { PilotDecision } from "@prisma/client";

const VALID_DECISIONS: PilotDecision[] = ["PENDING", "GO", "NO_GO"];

export async function updatePilotEvaluation(projectSlug: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return;
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return;

  const field = (name: string) => (formData.get(name) as string | null)?.trim() || null;
  const rawDecision = formData.get("decision") as string | null;
  const decision: PilotDecision = VALID_DECISIONS.includes(rawDecision as PilotDecision)
    ? (rawDecision as PilotDecision)
    : "PENDING";

  const data = {
    successCriteria: field("successCriteria"),
    executionNotes: field("executionNotes"),
    resultsSummary: field("resultsSummary"),
    decision,
    updatedById: session.user.id,
  };

  await prisma.pilotEvaluation.upsert({
    where: { projectSlug },
    create: { projectSlug, ...data },
    update: data,
  });

  revalidatePath(`/projects/${projectSlug}/pilot-evaluation`);
}
