import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { getProjectRole } from "@/lib/authz";
import { getOrgRole } from "@/lib/org-authz";
import {
  ALLOWED_TYPES,
  IMAGE_SIZE_LIMIT,
  DOC_SIZE_LIMIT,
  PUBLIC_BUCKET,
  PRIVATE_BUCKET,
  isImageType,
  buildKey,
  publicUrl,
  uploadObject,
  resizeImage,
} from "@/lib/storage";


export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  let visibility = formData.get("visibility") as string;
  const projectId = (formData.get("projectId") as string | null) || null;
  const organisationId = (formData.get("organisationId") as string | null) || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!["public", "private"].includes(visibility)) {
    return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
  }

  if (projectId) {
    const role = await getProjectRole(projectId, session.user.id);
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    visibility = "private";
  }

  if (organisationId) {
    const role = await getOrgRole(organisationId, session.user.id);
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    visibility = "private";
  }

  const mimeType = file.type;

  if (!ALLOWED_TYPES.has(mimeType)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 415 });
  }

  const sizeLimit = isImageType(mimeType) ? IMAGE_SIZE_LIMIT : DOC_SIZE_LIMIT;
  if (file.size > sizeLimit) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const arrayBuffer = await file.arrayBuffer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: Buffer = Buffer.from(arrayBuffer as any);
  let finalMimeType = mimeType;

  if (isImageType(mimeType) && mimeType !== "image/gif") {
    body = await resizeImage(body, mimeType);
    finalMimeType = "image/webp";
  }

  const userId = session.user.id;
  const key = buildKey(userId, file.name, mimeType);
  const bucket = visibility === "public" ? PUBLIC_BUCKET : PRIVATE_BUCKET;

  await uploadObject({ bucket, key, body, contentType: finalMimeType });

  const record = await prisma.file.create({
    data: {
      key,
      bucket,
      name: file.name,
      size: body.byteLength,
      mimeType: finalMimeType,
      ownerId: userId,
      ...(projectId ? { projectId } : {}),
      ...(organisationId ? { organisationId } : {}),
    },
  });

  if (visibility === "public") {
    return NextResponse.json({ url: publicUrl(key), fileId: record.id });
  }
  return NextResponse.json({ key, fileId: record.id });
}
