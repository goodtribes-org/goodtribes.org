"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";

export async function updateScalingPlan(projectSlug: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return;
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return;

  const field = (name: string) => (formData.get(name) as string | null)?.trim() || null;
  const data = {
    goals: field("goals"),
    geographies: field("geographies"),
    capitalPlan: field("capitalPlan"),
    teamOrLicenseModel: field("teamOrLicenseModel"),
    updatedById: session.user.id,
  };

  await prisma.scalingPlan.upsert({
    where: { projectSlug },
    create: { projectSlug, ...data },
    update: data,
  });

  revalidatePath(`/projects/${projectSlug}/scaling-plan`);
}
