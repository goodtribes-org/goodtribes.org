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
//
// userId is nullable so logged-out visitors can be checked too: a
// PROJECT_CHANNEL on a public project is readable by anyone (matching every
// other project workspace surface — updates, wiki, tasks, etc. — which are
// already public-viewable), but posting/reacting always requires an actual
// membership role, which in turn requires being logged in.
export async function getRoomAccess(roomId: string, userId: string | null): Promise<RoomAccess | null> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return null;

  if (room.type === "DM" || room.type === "GROUP") {
    if (!userId) return { room, canRead: false, canPost: false };
    const participant = await prisma.roomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    return { room, canRead: !!participant, canPost: !!participant };
  }

  if (room.type === "PROJECT_CHANNEL") {
    if (!room.projectId) return { room, canRead: false, canPost: false };
    const [role, project] = await Promise.all([
      userId ? getProjectRole(room.projectId, userId) : Promise.resolve(null),
      prisma.project.findUnique({ where: { id: room.projectId }, select: { visibility: true } }),
    ]);
    if (!role) {
      // Not a member (or not logged in at all) — still readable if the
      // project itself is public, but never postable.
      return { room, canRead: project?.visibility === "public", canPost: false };
    }
    const isLead = isLeadRole(role);
    const canPost = room.postingPolicy === "LEADS_ONLY" ? isLead : role !== "FOLLOWER";
    return { room, canRead: true, canPost };
  }

  // ORG_CHANNEL — unchanged, membership-gated for reading too (not part of
  // the public activity feed, unlike PROJECT_CHANNEL).
  if (!userId || !room.organisationId) return { room, canRead: false, canPost: false };
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
