import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";

async function updateStreak(userId: string, projectSlug: string) {
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true },
  });
  if (!project) return;
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const existing = await prisma.userStreak.findUnique({
    where: { userId_projectId: { userId, projectId: project.id } },
  });
  if (!existing) {
    await prisma.userStreak.create({
      data: { userId, projectId: project.id, currentWeeks: 1, longestWeeks: 1, lastActivityAt: now },
    });
  } else {
    const isNewWeek = existing.lastActivityAt < oneWeekAgo;
    const newCurrent = isNewWeek ? existing.currentWeeks + 1 : existing.currentWeeks;
    await prisma.userStreak.update({
      where: { userId_projectId: { userId, projectId: project.id } },
      data: {
        currentWeeks: newCurrent,
        longestWeeks: Math.max(newCurrent, existing.longestWeeks),
        lastActivityAt: now,
      },
    });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { cardId, newColumn } = await req.json();
  if (!cardId || !newColumn) {
    return NextResponse.json({ error: "Missing cardId or newColumn" }, { status: 400 });
  }

  const card = await prisma.kanbanCard.findUnique({ where: { id: cardId } });
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const maxOrder = await prisma.kanbanCard.aggregate({
    where: { projectSlug: card.projectSlug, column: newColumn, NOT: { id: cardId } },
    _max: { order: true },
  });

  await prisma.kanbanCard.update({
    where: { id: cardId },
    data: { column: newColumn, order: (maxOrder._max.order ?? -1) + 1 },
  });

  await updateStreak(session.user.id, card.projectSlug);

  if (newColumn !== card.column) {
    const project = await prisma.project.findUnique({
      where: { slug: card.projectSlug },
      select: { id: true },
    });
    if (project) {
      if (newColumn === "DONE") {
        const subtasks = await prisma.kanbanCardSubtask.findMany({
          where: { cardId: card.id }, orderBy: { order: "asc" }, select: { title: true, done: true },
        });
        await logActivity(project.id, session.user.id, "task_completed", { title: card.title, cardId: card.id, description: card.description, subtasks });
      } else {
        await logActivity(project.id, session.user.id, "task_moved", { title: card.title, cardId: card.id, fromColumn: card.column, toColumn: newColumn });
      }
    }
  }

  revalidatePath(`/projects/${card.projectSlug}/kanban`);

  return NextResponse.json({ ok: true });
}
