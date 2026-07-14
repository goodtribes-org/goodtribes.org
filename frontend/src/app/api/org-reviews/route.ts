import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server";


export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorId = session.user.id;

  let body: { organisationId?: string; rating?: number; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { organisationId, rating, comment } = body;

  if (!organisationId || typeof organisationId !== "string") {
    return NextResponse.json({ error: "organisationId is required" }, { status: 400 });
  }

  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be an integer from 1 to 5" }, { status: 400 });
  }

  if (comment !== undefined && (typeof comment !== "string" || comment.length > 500)) {
    return NextResponse.json({ error: "comment too long (max 500 chars)" }, { status: 400 });
  }

  const organisation = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { id: true, ownerId: true },
  });

  if (!organisation) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  }

  if (organisation.ownerId === authorId) {
    return NextResponse.json({ error: "You cannot review your own organisation" }, { status: 400 });
  }

  const trimmedComment = comment?.trim() || null;

  await prisma.organisationReview.upsert({
    where: { organisationId_authorId: { organisationId, authorId } },
    create: { organisationId, authorId, rating, comment: trimmedComment },
    update: { rating, comment: trimmedComment },
  });

  return NextResponse.json({ success: true });
}
