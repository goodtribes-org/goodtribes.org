"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProjectRecord } from "@/lib/createProject";
import { LEAN_CANVAS_FIELDS, type LeanCanvasField } from "../projects/[slug]/(workspace)/lean-canvas/fields";

export async function createLeanCanvasDraft(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const draft = await prisma.leanCanvasDraft.create({ data: { ownerId: session.user.id } });
  redirect(`/lean-canvas/${draft.id}`);
}

export async function updateLeanCanvasDraftBlock(
  draftId: string,
  field: LeanCanvasField,
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!LEAN_CANVAS_FIELDS.includes(field)) return;

  const draft = await prisma.leanCanvasDraft.findUnique({ where: { id: draftId }, select: { ownerId: true, promotedToProjectSlug: true } });
  if (!draft || draft.ownerId !== session.user.id || draft.promotedToProjectSlug) return;

  const value = (formData.get("value") as string | null)?.trim() || null;

  await prisma.leanCanvasDraft.update({ where: { id: draftId }, data: { [field]: value } });
  revalidatePath(`/lean-canvas/${draftId}`);
}

export async function promoteLeanCanvasDraftToProject(
  draftId: string,
  formData: FormData
): Promise<{ slug: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const draft = await prisma.leanCanvasDraft.findUnique({ where: { id: draftId } });
  if (!draft || draft.ownerId !== session.user.id) return { error: "Not found" };
  if (draft.promotedToProjectSlug) return { slug: draft.promotedToProjectSlug };

  const title = (formData.get("title") as string | null)?.trim();
  if (!title) return { error: "Title required" };

  const project = await createProjectRecord({ title, ownerId: session.user.id, isSandbox: true });

  await prisma.leanCanvas.create({
    data: {
      projectSlug: project.slug,
      updatedById: session.user.id,
      ...Object.fromEntries(LEAN_CANVAS_FIELDS.map((f) => [f, draft[f]])),
    },
  });
  await prisma.leanCanvasDraft.update({ where: { id: draftId }, data: { promotedToProjectSlug: project.slug } });

  return { slug: project.slug };
}
