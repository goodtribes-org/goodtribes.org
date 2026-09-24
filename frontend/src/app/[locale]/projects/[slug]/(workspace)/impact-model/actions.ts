"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { IMPACT_MODEL_FIELDS, type ImpactModelField } from "./fields";

export async function updateImpactModelBlock(
  projectSlug: string,
  field: ImpactModelField,
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!IMPACT_MODEL_FIELDS.includes(field)) return;

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return;
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return;

  const value = (formData.get("value") as string | null)?.trim() || null;
  await prisma.impactModel.upsert({
    where: { projectSlug },
    create: { projectSlug, [field]: value, updatedById: session.user.id },
    update: { [field]: value, updatedById: session.user.id },
  });

  revalidatePath(`/projects/${projectSlug}/impact-model`);
}
