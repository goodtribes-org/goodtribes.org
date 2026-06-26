import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server";


export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fromUserId = session.user.id;

  let body: { toUserId?: string; projectId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { toUserId, projectId, message } = body;

  if (!toUserId || typeof toUserId !== "string") {
    return NextResponse.json({ error: "toUserId is required" }, { status: 400 });
  }

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  if (message.length > 160) {
    return NextResponse.json({ error: "message too long (max 160 chars)" }, { status: 400 });
  }

  if (fromUserId === toUserId) {
    return NextResponse.json({ error: "You cannot give kudos to yourself" }, { status: 400 });
  }

  await prisma.kudos.create({
    data: {
      fromUserId,
      toUserId,
      projectId: projectId ?? null,
      message: message.trim(),
    },
  });

  return NextResponse.json({ success: true });
}
