"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { persistAiMessage } from "@/lib/aiThreadReply";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { DREAM_OPENER } from "@/lib/prompts/dreamConversation";
import { escapeHtml } from "@/lib/renderBody";
import { sendRoomMessage } from "@/app/[locale]/messages/actions";

const MAX_DREAM_LENGTH = 2000;

// The dream box on the homepage. It starts the same Drömsamtal as the
// start choice in /projects/new, except the visitor's text becomes the first
// message, so the AI replies to it right away. That conversation is private
// (an AI_INTAKE room only the initiator can read). No project exists until
// the visitor approves the summary, the same flow as today.
//
// It is kept separate from startDreamConversation so the existing flow stays
// untouched. The mode is AGENT ("Låt AI:n göra jobbet"), the one AI option
// the start offers: the AI drafts, the visitor overwrites what they like,
// and AI can be turned down or off later in the project's AI settings.
export async function startDreamFromHome(text: string) {
  const session = await auth();
  const userId = session?.user?.id;
  // The client saves the text before calling this, and it is restored after
  // login, so nothing the visitor wrote is lost on the way.
  if (!userId) redirect("/login?callbackUrl=/&from=dream");

  const dream = text.trim().slice(0, MAX_DREAM_LENGTH);
  if (!dream) return;

  // No AI configured (as in production today): Snabbstart, the same fallback
  // /projects/new uses.
  if (!(await isAiProjectStartAvailable(userId))) redirect("/projects/new?manual=1");

  const room = await prisma.room.create({ data: { type: "AI_INTAKE" } });
  await prisma.roomParticipant.create({ data: { roomId: room.id, userId } });
  await prisma.dreamConversation.create({ data: { roomId: room.id, userId, aiMode: "AGENT" } });

  const aiUser = await getAiParticipantUser();
  const opener = DREAM_OPENER.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  await persistAiMessage(room.id, opener, aiUser.id);

  // Goes through the normal chat path (moderation, search index, and the
  // Drömsamtal auto-reply), exactly as if the visitor had typed it there.
  await sendRoomMessage(room.id, `<p>${escapeHtml(dream)}</p>`);

  redirect(`/projects/new/samtal/${room.id}`);
}
