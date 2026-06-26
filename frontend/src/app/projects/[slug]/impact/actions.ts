"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";


async function assertOwnerOrAdmin(projectSlug: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true, members: { where: { userId }, select: { role: true } } },
  });
  const role = project?.members[0]?.role;
  if (!role || !["owner", "admin"].includes(role)) {
    redirect(`/projects/${projectSlug}/impact`);
  }
}

export async function addImpactMetric(projectSlug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await assertOwnerOrAdmin(projectSlug, session.user.id);

  const label = (formData.get("label") as string).trim();
  const unit = (formData.get("unit") as string).trim();
  const targetRaw = formData.get("targetValue") as string | null;
  const targetValue = targetRaw && targetRaw.trim() !== "" ? parseFloat(targetRaw) : null;
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (!label || !unit) return;

  await prisma.impactMetric.create({
    data: {
      projectSlug,
      label,
      unit,
      targetValue: targetValue ?? undefined,
      description,
    },
  });

  revalidatePath(`/projects/${projectSlug}/impact`);
}

export async function updateImpactMetric(
  metricId: string,
  projectSlug: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await assertOwnerOrAdmin(projectSlug, session.user.id);

  const valueRaw = formData.get("value") as string;
  const note = (formData.get("note") as string | null)?.trim() || null;
  const value = parseFloat(valueRaw);

  if (isNaN(value)) return;

  await prisma.$transaction([
    prisma.impactUpdate.create({
      data: {
        impactMetricId: metricId,
        value,
        note,
        updatedById: session.user.id,
      },
    }),
    prisma.impactMetric.update({
      where: { id: metricId },
      data: { currentValue: value },
    }),
  ]);

  revalidatePath(`/projects/${projectSlug}/impact`);
}
