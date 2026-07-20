import { prisma } from "@/lib/prisma";

const AI_EMAIL = "ai@goodtribes.org";
const AI_NAME = "AI";

let cached: { id: string; name: string | null } | null = null;

// Idéverkstaden's AI participant is a real User row — Message.authorId is a
// required FK, so this is simpler than adding a nullable-author special
// case throughout the message pipeline. Found-or-created lazily and cached
// in-process (safe: this app runs as a long-lived Node server, not a
// per-request serverless function, and the row never changes once created).
export async function getAiParticipantUser(): Promise<{ id: string; name: string | null }> {
  if (cached) return cached;

  let user = await prisma.user.findUnique({
    where: { email: AI_EMAIL },
    select: { id: true, name: true },
  });
  if (!user) {
    user = await prisma.user.create({
      data: { email: AI_EMAIL, name: AI_NAME, showProfile: false },
      select: { id: true, name: true },
    });
  }

  cached = user;
  return user;
}
