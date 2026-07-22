"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { escapeHtml } from "@/lib/renderBody";
import { sendRoomMessage } from "@/app/[locale]/messages/actions";

export async function createIdeaThread(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const problem = (formData.get("problem") as string | null)?.trim();
  if (!problem) return;
  const imageUrl = (formData.get("imageUrl") as string | null)?.trim() || null;

  const name = problem.length > 80 ? `${problem.slice(0, 80)}…` : problem;

  const room = await prisma.room.create({
    data: { type: "IDEA_THREAD", name, imageUrl },
  });

  // sendRoomMessage lazily registers the sender as a RoomParticipant for
  // open IDEA_THREAD rooms (see messages/actions.ts), so no separate
  // roster row needs to be created here.
  await sendRoomMessage(room.id, `<p>${escapeHtml(problem)}</p>`);

  redirect(`/ideaverkstad/${room.id}`);
}

// Creates a project-scoped idea session (PRD 5.10: "Inne i ett projekt...
// Bara projektmedlemmar ser och deltar"). Membership is enforced by
// getRoomAccess when the resulting thread is opened/posted to, not here —
// this only needs the caller to be logged in to create the room.
export async function createProjectIdeaThread(projectId: string, name?: string): Promise<{ roomId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const room = await prisma.room.create({
    data: { type: "IDEA_THREAD", projectId, name: name?.trim() || null },
  });

  return { roomId: room.id };
}
