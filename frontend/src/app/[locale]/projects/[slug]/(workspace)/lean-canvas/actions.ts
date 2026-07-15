"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasProjectRole, isRealMember, PROJECT_LEAD_ROLES } from "@/lib/authz";
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
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return;

  const value = (formData.get("value") as string | null)?.trim() || null;

  await prisma.leanCanvas.upsert({
    where: { projectSlug },
    create: { projectSlug, [field]: value, updatedById: session.user.id },
    update: { [field]: value, updatedById: session.user.id },
  });

  revalidatePath(`/projects/${projectSlug}/lean-canvas`);
}

export async function addLeanCanvasComment(projectSlug: string, body: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const trimmed = body.trim();
  if (!trimmed) return { error: "Empty comment" };

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return { error: "Project not found" };
  if (!(await isRealMember(project.id, session.user.id))) return { error: "Not a project member" };

  const comment = await prisma.leanCanvasComment.create({
    data: { projectSlug, authorId: session.user.id, body: trimmed },
    include: { author: { select: { id: true, name: true } } },
  });

  revalidatePath(`/projects/${projectSlug}/lean-canvas`);
  return { comment };
}

export async function deleteLeanCanvasComment(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const comment = await prisma.leanCanvasComment.findUnique({ where: { id: commentId } });
  if (!comment) return { error: "Comment not found" };
  if (comment.authorId !== session.user.id) return { error: "Not authorized" };

  await prisma.leanCanvasComment.delete({ where: { id: commentId } });
  revalidatePath(`/projects/${comment.projectSlug}/lean-canvas`);
  return { ok: true };
}
