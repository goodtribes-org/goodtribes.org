import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
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

  const file = await prisma.file.findUnique({ where: { key } });
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (file.ownerId !== session.user.id) {
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
