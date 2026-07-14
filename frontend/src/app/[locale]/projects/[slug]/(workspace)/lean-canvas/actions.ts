"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRealMember } from "@/lib/authz";
import { LEAN_CANVAS_FIELDS, type LeanCanvasField } from "./fields";

export async function updateLeanCanvasBlock(
  projectSlug: string,
  field: LeanCanvasField,
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!LEAN_CANVAS_FIELDS.includes(field)) return;

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return;
  if (!(await isRealMember(project.id, session.user.id))) return;

  const value = (formData.get("value") as string | null)?.trim() || null;

  await prisma.leanCanvas.upsert({
    where: { projectSlug },
    create: { projectSlug, [field]: value, updatedById: session.user.id },
    update: { [field]: value, updatedById: session.user.id },
  });

  revalidatePath(`/projects/${projectSlug}/lean-canvas`);
}
