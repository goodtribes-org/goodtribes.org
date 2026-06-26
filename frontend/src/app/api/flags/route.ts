import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server";


export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { projectId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { projectId, reason } = body;

  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await prisma.projectFlag.create({
    data: {
      projectId,
      flaggedById: userId,
      reason: reason.trim(),
      status: "pending",
    },
  });

  return NextResponse.json({ success: true });
}
