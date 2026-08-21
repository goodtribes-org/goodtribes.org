"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { VALUE_PROPOSITION_FIELDS, type ValuePropositionField } from "./fields";

export async function updateValuePropositionBlock(
  projectSlug: string,
  field: ValuePropositionField,
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!VALUE_PROPOSITION_FIELDS.includes(field)) return;

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return;
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return;

  const value = (formData.get("value") as string | null)?.trim() || null;

  const canvas = await prisma.valueProposition.upsert({
    where: { projectSlug },
    create: { projectSlug, [field]: value, updatedById: session.user.id },
    update: { [field]: value, updatedById: session.user.id },
  });

  // Full-canvas snapshot on every block save — same linear-history pattern
  // as LeanCanvasVersion.
  await prisma.valuePropositionVersion.create({
    data: {
      projectSlug,
      savedById: session.user.id,
      ...Object.fromEntries(VALUE_PROPOSITION_FIELDS.map((f) => [f, canvas[f]])),
    },
  });

  revalidatePath(`/projects/${projectSlug}/value-proposition`);
}

export async function getValuePropositionHistory(projectSlug: string) {
  return prisma.valuePropositionVersion.findMany({
    where: { projectSlug },
    orderBy: { createdAt: "desc" },
    include: { savedBy: { select: { name: true } } },
  });
}
