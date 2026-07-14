import { prisma } from "@/lib/prisma";
import { getProjectRole, isLeadRole } from "@/lib/authz";
import type { Room } from "@prisma/client";

export type RoomAccess = {
  room: Room;
  canRead: boolean;
  canPost: boolean;
};

// PROJECT_CHANNEL/ORG_CHANNEL access is always re-checked live against
// ProjectMember/OrganisationMember — RoomParticipant rows for those two
// types are a lazily-upserted roster/read-marker cache, never the source
// of truth for who can read/post. DM/GROUP rooms have no external
// membership source, so RoomParticipant IS authoritative there.
export async function getRoomAccess(roomId: string, userId: string): Promise<RoomAccess | null> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return null;

  if (room.type === "DM" || room.type === "GROUP") {
    const participant = await prisma.roomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    return { room, canRead: !!participant, canPost: !!participant };
  }

  if (room.type === "PROJECT_CHANNEL") {
    if (!room.projectId) return { room, canRead: false, canPost: false };
    const role = await getProjectRole(room.projectId, userId);
    if (!role) return { room, canRead: false, canPost: false };
    const isLead = isLeadRole(role);
    const canPost = room.postingPolicy === "LEADS_ONLY" ? isLead : role !== "FOLLOWER";
    return { room, canRead: true, canPost };
  }

  // ORG_CHANNEL
  if (!room.organisationId) return { room, canRead: false, canPost: false };
  const [member, org] = await Promise.all([
    prisma.organisationMember.findUnique({
      where: { organisationId_userId: { organisationId: room.organisationId, userId } },
    }),
    prisma.organisation.findUnique({ where: { id: room.organisationId }, select: { ownerId: true } }),
  ]);
  const isOwner = org?.ownerId === userId;
  if (!member && !isOwner) return { room, canRead: false, canPost: false };
  const isLead = isOwner || member?.role === "ADMIN";
  const canPost = room.postingPolicy === "LEADS_ONLY" ? isLead : true;
  return { room, canRead: true, canPost };
}
