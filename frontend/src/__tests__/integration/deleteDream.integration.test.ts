// Real-Postgres coverage for deleting a Drömsamtal: the room, its messages
// and the DreamConversation row go together (cascade), the messages leave
// the search index, only the owner can delete it, and a project already
// created from it survives.

import { prisma } from "@/lib/prisma";

const mockAuth = jest.fn();
const mockDeleteDocument = jest.fn();
jest.mock("../../auth", () => ({ auth: () => mockAuth() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn(), unstable_cache: (fn: unknown) => fn }));
jest.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => "sv",
}));
jest.mock("../../lib/meili", () => ({ indexDocuments: jest.fn(), deleteDocument: (...a: unknown[]) => mockDeleteDocument(...a) }));

import { deleteDreamConversation } from "@/app/[locale]/projects/new/samtal/actions";

const s = `${process.pid}-delete-dream`;

async function dreamFor(userId: string, extra: { status?: "in_progress" | "confirmed"; projectId?: string } = {}) {
  const room = await prisma.room.create({ data: { type: "AI_INTAKE" } });
  await prisma.roomParticipant.create({ data: { roomId: room.id, userId } });
  const message = await prisma.message.create({ data: { roomId: room.id, authorId: userId, body: "Min dröm" } });
  await prisma.dreamConversation.create({ data: { roomId: room.id, userId, aiMode: "AGENT", ...extra } });
  return { roomId: room.id, messageId: message.id };
}

// The action ends with redirect(), which throws NEXT_REDIRECT.
const deleted = (roomId: string) => expect(deleteDreamConversation(roomId)).rejects.toThrow("NEXT_REDIRECT");

describe("deleting a Drömsamtal", () => {
  it("deletes the owner's conversation, refuses anyone else, keeps the project", async () => {
    const owner = await prisma.user.create({ data: { email: `owner-${s}@test.goodtribes.org`, name: "Owner" } });
    const other = await prisma.user.create({ data: { email: `other-${s}@test.goodtribes.org`, name: "Other" } });
    const project = await prisma.project.create({ data: { slug: `dream-${s}`, title: "Dream", ownerId: owner.id } });
    const rooms: string[] = [];
    try {
      const mine = await dreamFor(owner.id);
      const theirs = await dreamFor(other.id);
      const done = await dreamFor(owner.id, { status: "confirmed", projectId: project.id });
      rooms.push(mine.roomId, theirs.roomId, done.roomId);
      mockAuth.mockResolvedValue({ user: { id: owner.id } });

      await deleted(mine.roomId);
      expect(await prisma.room.findUnique({ where: { id: mine.roomId } })).toBeNull();
      expect(await prisma.message.findUnique({ where: { id: mine.messageId } })).toBeNull();
      expect(await prisma.dreamConversation.findUnique({ where: { roomId: mine.roomId } })).toBeNull();
      expect(mockDeleteDocument).toHaveBeenCalledWith("messages", mine.messageId);

      await expect(deleteDreamConversation(theirs.roomId)).rejects.toThrow("Samtalet hittades inte");
      expect(await prisma.dreamConversation.findUnique({ where: { roomId: theirs.roomId } })).not.toBeNull();

      await deleted(done.roomId);
      expect(await prisma.dreamConversation.findUnique({ where: { roomId: done.roomId } })).toBeNull();
      expect(await prisma.project.findUnique({ where: { id: project.id } })).not.toBeNull();
    } finally {
      await prisma.room.deleteMany({ where: { id: { in: rooms } } });
      await prisma.project.delete({ where: { id: project.id } });
      await prisma.user.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
    }
  });
});
