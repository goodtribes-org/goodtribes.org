"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { escapeHtml } from "@/lib/renderBody";
import { sendRoomMessage } from "@/app/[locale]/messages/actions";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { persistAiMessage } from "@/lib/aiThreadReply";

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

// Paket E: the "Låt AI guida mig" entry point, sibling to createIdeaThread
// above. No form fields -- rather than requiring the user to type their
// problem statement upfront, the AI itself opens with "Vad vill du göra?
// Vilket problem vill du lösa?" (AI_INTAKE_SYSTEM_PROMPT in aiThreadReply.ts
// drives the rest of the conversation from there). Explicitly creates the
// creator's RoomParticipant row here (rather than relying on
// sendRoomMessage's lazy registration, which only fires for the *human*
// sender — the opening message here is AI-authored) since AI_INTAKE access
// is RoomParticipant-authoritative (see roomAuth.ts), unlike open
// IDEA_THREAD.
export async function createAiIntakeThread() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const room = await prisma.room.create({
    data: { type: "AI_INTAKE" },
  });
  await prisma.roomParticipant.create({
    data: { roomId: room.id, userId },
  });

  // The opener itself is a fixed string, not an AI call — no isAiEnabled()
  // check needed here. The *next* message the user sends is what actually
  // triggers triggerAiThreadReply (see messages/actions.ts), which already
  // degrades gracefully ("AI är inte konfigurerad just nu") if
  // ANTHROPIC_API_KEY is unset — same fallback every other AI touchpoint in
  // this codebase uses.
  const aiUser = await getAiParticipantUser();
  await persistAiMessage(
    room.id,
    "<p>Vad vill du göra? Vilket problem vill du lösa?</p>",
    aiUser.id
  );

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
