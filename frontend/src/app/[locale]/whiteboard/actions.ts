"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProjectRecord } from "@/lib/createProject";
import { Prisma } from "@prisma/client";

export async function createWhiteboardDraft(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const draft = await prisma.whiteboardDraft.create({ data: { ownerId: session.user.id } });
  redirect(`/whiteboard/${draft.id}`);
}

type CanvasSaveResult =
  | { ok: true; version: number }
  | { ok: false; conflict: true; latest: { documentState: Prisma.JsonValue; version: number } }
  | { ok: false; conflict: false; error: string };

// Optimistic locking, same protocol as sprints/[sprintId]/actions.ts's
// autosaveCanvas — mainly guards against the same owner having two tabs
// open, since there are no other collaborators on a project-less draft.
export async function autosaveWhiteboardDraft(
  draftId: string,
  documentState: Prisma.InputJsonValue,
  expectedVersion: number
): Promise<CanvasSaveResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, conflict: false, error: "Not logged in" };

  const draft = await prisma.whiteboardDraft.findUnique({
    where: { id: draftId },
    select: { ownerId: true, promotedToProjectSlug: true },
  });
  if (!draft || draft.ownerId !== session.user.id) return { ok: false, conflict: false, error: "Not authorized" };
  if (draft.promotedToProjectSlug) return { ok: false, conflict: false, error: "Already promoted" };

  const result = await prisma.whiteboardDraft.updateMany({
    where: { id: draftId, version: expectedVersion },
    data: { documentState, version: { increment: 1 } },
  });

  if (result.count === 0) {
    const latest = await prisma.whiteboardDraft.findUnique({
      where: { id: draftId },
      select: { documentState: true, version: true },
    });
    if (!latest) return { ok: false, conflict: false, error: "Draft not found" };
    return { ok: false, conflict: true, latest };
  }

  revalidatePath(`/whiteboard/${draftId}`);
  return { ok: true, version: expectedVersion + 1 };
}

export async function promoteWhiteboardDraftToProject(
  draftId: string,
  formData: FormData
): Promise<{ slug: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const draft = await prisma.whiteboardDraft.findUnique({ where: { id: draftId } });
  if (!draft || draft.ownerId !== session.user.id) return { error: "Not found" };
  if (draft.promotedToProjectSlug) return { slug: draft.promotedToProjectSlug };

  const title = (formData.get("title") as string | null)?.trim();
  if (!title) return { error: "Title required" };

  const project = await createProjectRecord({ title, ownerId: session.user.id, isSandbox: true });

  await prisma.sprint.create({
    data: {
      projectSlug: project.slug,
      createdById: session.user.id,
      name: title,
      pace: "TOGETHER",
      phases: {
        create: {
          phase: "UNDERSTAND",
          status: "OPEN",
          openedAt: new Date(),
          documentState: draft.documentState ?? Prisma.JsonNull,
        },
      },
    },
  });
  await prisma.whiteboardDraft.update({ where: { id: draftId }, data: { promotedToProjectSlug: project.slug } });

  return { slug: project.slug };
}
