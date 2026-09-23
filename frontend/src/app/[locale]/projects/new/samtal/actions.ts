"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { persistAiMessage } from "@/lib/aiThreadReply";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { isDreamComplete, parseDreamState, parseOpenQuestions, type DreamArea } from "@/lib/dreamConversation";
import { DREAM_OPENER } from "@/lib/prompts/dreamConversation";
import { escapeHtml } from "@/lib/renderBody";

async function requireUser(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

// Vägval → "Låt AI:n göra jobbet" / "AI:n hjälper mig": starts a Drömsamtal.
// "Jag gör allt själv" never gets here — it goes straight to the manual
// Snabbstart. The chosen mode is stored now and becomes the project's
// aiMode once the summary is approved.
export async function startDreamConversation(mode: string) {
  const userId = await requireUser();
  if (!(await isFeatureEnabled("ai-project-start", userId))) redirect("/projects/new?manual=1");
  if (mode !== "AGENT" && mode !== "ASSIST") throw new Error("Ogiltigt val");

  const room = await prisma.room.create({ data: { type: "AI_INTAKE" } });
  // AI_INTAKE access is RoomParticipant-authoritative (see roomAuth.ts) —
  // only the initiativtagare can read or post.
  await prisma.roomParticipant.create({ data: { roomId: room.id, userId } });
  await prisma.dreamConversation.create({ data: { roomId: room.id, userId, aiMode: mode } });

  // A fixed opener, not an AI call — the first model call happens on the
  // user's first reply (see triggerDreamReply).
  const aiUser = await getAiParticipantUser();
  const html = DREAM_OPENER.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  await persistAiMessage(room.id, html, aiUser.id);

  redirect(`/projects/new/samtal/${room.id}`);
}

async function requireOwnDream(roomId: string, userId: string) {
  const dream = await prisma.dreamConversation.findUnique({ where: { roomId } });
  if (!dream || dream.userId !== userId) throw new Error("Samtalet hittades inte");
  return dream;
}

export type DreamProgress = {
  covered: DreamArea[];
  openQuestionCount: number;
  complete: boolean;
  status: string;
};

// Polled by the progress bar while the conversation page is open — the AI's
// reply (and its state update) arrives asynchronously after each message.
export async function getDreamProgress(roomId: string): Promise<DreamProgress> {
  const userId = await requireUser();
  const dream = await requireOwnDream(roomId, userId);
  const state = parseDreamState(dream.state);
  return {
    covered: state.covered,
    openQuestionCount: parseOpenQuestions(dream.openQuestions).length,
    complete: isDreamComplete(state),
    status: dream.status,
  };
}

// The conversation can contain personal information, so the initiativtagare
// can delete it outright: the room (and with it every message, the
// participant row and the DreamConversation row) is removed. A project
// already created from it is not affected.
export async function deleteDreamConversation(roomId: string) {
  const userId = await requireUser();
  await requireOwnDream(roomId, userId);
  await prisma.room.delete({ where: { id: roomId } });
  redirect("/projects/new");
}
