"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProjectRecord } from "@/lib/createProject";
import { LEAN_CANVAS_FIELDS, type LeanCanvasField } from "../projects/[slug]/(workspace)/lean-canvas/fields";

export async function createLeanCanvasDraft(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) redirect("/lean-canvas/new");

  const draft = await prisma.leanCanvasDraft.create({ data: { ownerId: session.user.id, name } });
  redirect(`/lean-canvas/${draft.id}`);
}

// Open by design, not just the creator — any logged-in user can edit any
// not-yet-promoted draft, same as anyone can post in a project-less
// Idéverkstaden thread or draw on a WhiteboardDraft.
export async function updateLeanCanvasDraftBlock(
  draftId: string,
  field: LeanCanvasField,
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!LEAN_CANVAS_FIELDS.includes(field)) return;

  const draft = await prisma.leanCanvasDraft.findUnique({ where: { id: draftId }, select: { promotedToProjectSlug: true } });
  if (!draft || draft.promotedToProjectSlug) return;

  const value = (formData.get("value") as string | null)?.trim() || null;

  await prisma.leanCanvasDraft.update({ where: { id: draftId }, data: { [field]: value } });
  revalidatePath(`/lean-canvas/${draftId}`);
}

// Open to any logged-in user, not just the creator — whoever promotes it
// becomes the new project's owner, same as promoting an Idéverkstaden
// thread or a WhiteboardDraft doesn't require being its original creator.
export async function promoteLeanCanvasDraftToProject(
  draftId: string,
  formData: FormData
): Promise<{ slug: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const draft = await prisma.leanCanvasDraft.findUnique({ where: { id: draftId } });
  if (!draft) return { error: "Not found" };
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
