import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { getProjectRole } from "@/lib/authz";
import { getOrgRole } from "@/lib/org-authz";
import { getRoomAccess } from "@/lib/roomAuth";
import { PRIVATE_BUCKET, getObjectStream } from "@/lib/storage";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key: keyParts } = await params;
  const key = keyParts.join("/");

  const file = await prisma.file.findUnique({ where: { key }, include: { message: { select: { roomId: true } } } });
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = session.user.id;
  const isOwner = file.ownerId === userId;
  const isProjectMember = file.projectId ? !!(await getProjectRole(file.projectId, userId)) : false;
  const isOrgMember = file.organisationId ? !!(await getOrgRole(file.organisationId, userId)) : false;
  // Message attachments in a DM/GROUP have no project/org to check against —
  // access follows the room itself (RoomParticipant), same as reading the
  // message that carries the attachment.
  const canReadViaRoom = file.message ? !!(await getRoomAccess(file.message.roomId, userId))?.canRead : false;

  if (!isOwner && !isProjectMember && !isOrgMember && !canReadViaRoom) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { body, contentType, contentLength } = await getObjectStream(PRIVATE_BUCKET, key);

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(contentLength),
      "Content-Disposition": `inline; filename="${file.name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
