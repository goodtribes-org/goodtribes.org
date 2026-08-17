"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProjectRecord } from "@/lib/createProject";
import { Prisma } from "@prisma/client";

export async function createWhiteboardDraft(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) redirect("/whiteboard/new");

  const draft = await prisma.whiteboardDraft.create({ data: { ownerId: session.user.id, name } });
  redirect(`/whiteboard/${draft.id}`);
}

type CanvasSaveResult =
  | { ok: true; version: number }
  | { ok: false; conflict: true; latest: { documentState: Prisma.JsonValue; version: number } }
  | { ok: false; conflict: false; error: string };

// Open by design, not just the creator — any logged-in user can draw on
// any not-yet-promoted draft, same as anyone can post in a project-less
// Idéverkstaden thread. Optimistic locking (same protocol as
// sprints/[sprintId]/actions.ts's autosaveCanvas) now also covers real
// concurrent editors, not just the same owner's two tabs.
export async function autosaveWhiteboardDraft(
  draftId: string,
  documentState: Prisma.InputJsonValue,
  expectedVersion: number
): Promise<CanvasSaveResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, conflict: false, error: "Not logged in" };

  const draft = await prisma.whiteboardDraft.findUnique({
    where: { id: draftId },
    select: { promotedToProjectSlug: true },
  });
  if (!draft) return { ok: false, conflict: false, error: "Not found" };
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

// Open to any logged-in user, not just the creator — whoever promotes it
// becomes the new project's owner, same as promoting an Idéverkstaden
// thread doesn't require being its original creator.
export async function promoteWhiteboardDraftToProject(
  draftId: string,
  formData: FormData
): Promise<{ slug: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const draft = await prisma.whiteboardDraft.findUnique({ where: { id: draftId } });
  if (!draft) return { error: "Not found" };
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
