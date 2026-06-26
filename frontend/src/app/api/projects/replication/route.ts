import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { projectId, openForReplication } = body as { projectId?: string; openForReplication?: boolean };
  if (!projectId || typeof openForReplication !== "boolean") {
    return NextResponse.json({ error: "projectId and openForReplication required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { members: { select: { userId: true, role: true } } } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = project.members.find((m) => m.userId === session.user!.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.project.update({ where: { id: projectId }, data: { openForReplication } });
  return NextResponse.json({ ok: true });
}
