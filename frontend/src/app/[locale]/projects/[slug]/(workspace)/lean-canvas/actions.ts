"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasProjectRole, isRealMember, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { LEAN_CANVAS_FIELDS, LEAN_CANVAS_STORED_FIELDS, type LeanCanvasField } from "./fields";
import { recordHumanEdits } from "@/lib/fieldProvenance";

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
  const before = await prisma.leanCanvas.findUnique({ where: { projectSlug }, select: { [field]: true } });

  const canvas = await prisma.leanCanvas.upsert({
    where: { projectSlug },
    create: { projectSlug, [field]: value, updatedById: session.user.id },
    update: { [field]: value, updatedById: session.user.id },
  });

  // Full-canvas snapshot on every block save — linear history alongside the
  // single mutable "current" row (see LeanCanvasVersion's schema comment).
  await prisma.leanCanvasVersion.create({
    data: {
      projectSlug,
      savedById: session.user.id,
      ...Object.fromEntries(LEAN_CANVAS_STORED_FIELDS.map((f) => [f, canvas[f]])),
    },
  });

  await recordHumanEdits(
    project.id,
    "leanCanvas",
    before,
    { [field]: value },
    session.user.id,
  );

  revalidatePath(`/projects/${projectSlug}/lean-canvas`);
  // The Impact block is also the last step of the impact model.
  if (field === "impact") revalidatePath(`/projects/${projectSlug}/impact-model`);
}

export async function getLeanCanvasHistory(projectSlug: string) {
  return prisma.leanCanvasVersion.findMany({
    where: { projectSlug },
    orderBy: { createdAt: "desc" },
    include: { savedBy: { select: { name: true } } },
  });
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
