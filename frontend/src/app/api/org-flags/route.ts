import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server";


export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { organisationId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { organisationId, reason } = body;

  if (!organisationId || typeof organisationId !== "string") {
    return NextResponse.json({ error: "organisationId is required" }, { status: 400 });
  }

  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const organisation = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { id: true },
  });

  if (!organisation) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  }

  await prisma.organisationFlag.create({
    data: {
      organisationId,
      flaggedById: userId,
      reason: reason.trim(),
      status: "pending",
    },
  });

  return NextResponse.json({ success: true });
}
