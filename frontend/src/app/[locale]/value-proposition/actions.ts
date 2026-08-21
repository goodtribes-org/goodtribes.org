"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProjectRecord } from "@/lib/createProject";
import { VALUE_PROPOSITION_FIELDS, type ValuePropositionField } from "../projects/[slug]/(workspace)/value-proposition/fields";

export async function createValuePropositionDraft(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) redirect("/value-proposition/new");

  const draft = await prisma.valuePropositionDraft.create({ data: { ownerId: session.user.id, name } });
  redirect(`/value-proposition/${draft.id}`);
}

// Open by design, not just the creator — same reasoning as
// updateLeanCanvasDraftBlock (any logged-in user can edit any
// not-yet-promoted draft).
export async function updateValuePropositionDraftBlock(
  draftId: string,
  field: ValuePropositionField,
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!VALUE_PROPOSITION_FIELDS.includes(field)) return;

  const draft = await prisma.valuePropositionDraft.findUnique({ where: { id: draftId }, select: { promotedToProjectSlug: true } });
  if (!draft || draft.promotedToProjectSlug) return;

  const value = (formData.get("value") as string | null)?.trim() || null;

  await prisma.valuePropositionDraft.update({ where: { id: draftId }, data: { [field]: value } });
  revalidatePath(`/value-proposition/${draftId}`);
}

// Open to any logged-in user, not just the creator — same reasoning as
// promoteLeanCanvasDraftToProject.
export async function promoteValuePropositionDraftToProject(
  draftId: string,
  formData: FormData
): Promise<{ slug: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const draft = await prisma.valuePropositionDraft.findUnique({ where: { id: draftId } });
  if (!draft) return { error: "Not found" };
  if (draft.promotedToProjectSlug) return { slug: draft.promotedToProjectSlug };

  const title = (formData.get("title") as string | null)?.trim();
  if (!title) return { error: "Title required" };

  const project = await createProjectRecord({ title, ownerId: session.user.id, isSandbox: true });

  await prisma.valueProposition.create({
    data: {
      projectSlug: project.slug,
      updatedById: session.user.id,
      ...Object.fromEntries(VALUE_PROPOSITION_FIELDS.map((f) => [f, draft[f]])),
    },
  });
  await prisma.valuePropositionDraft.update({ where: { id: draftId }, data: { promotedToProjectSlug: project.slug } });

  return { slug: project.slug };
}
