"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOwnerOrAdmin } from "@/lib/authz";
import { getChecklistForPhase } from "@/lib/projectPhase";
import type { ProjectPhase } from "@prisma/client";

// The first time a phase gets a date (previously had none), its checklist
// items are seeded with that same date — a real, stored value each item
// keeps until the user schedules that specific item differently. Later
// changes to the phase's own date don't re-trigger this (see the
// wasEmpty check in the caller) — only the initial "phase now has a
// date" transition does, so this never overwrites a date someone set on
// an individual item in the meantime.
async function seedChecklistItemDatesFromPhase(
  projectId: string,
  phase: ProjectPhase,
  startDate: Date | null,
  targetDate: Date | null
): Promise<void> {
  if (!startDate && !targetDate) return;
  const itemKeys = getChecklistForPhase(phase).map((item) => item.key);
  if (itemKeys.length === 0) return;

  // Rows that already exist but were never scheduled themselves.
  await prisma.initiativeChecklistItem.updateMany({
    where: { projectId, itemKey: { in: itemKeys }, startDate: null, dueDate: null },
    data: { startDate, dueDate: targetDate },
  });

  // Items with no row at all yet (never toggled or scheduled).
  const existing = await prisma.initiativeChecklistItem.findMany({
    where: { projectId, itemKey: { in: itemKeys } },
    select: { itemKey: true },
  });
  const existingKeys = new Set(existing.map((e) => e.itemKey));
  const missingKeys = itemKeys.filter((key) => !existingKeys.has(key));
  if (missingKeys.length > 0) {
    await prisma.initiativeChecklistItem.createMany({
      data: missingKeys.map((itemKey) => ({ projectId, phase, itemKey, startDate, dueDate: targetDate })),
    });
  }
}

export async function upsertPhaseTarget(
  projectId: string,
  slug: string,
  phase: ProjectPhase,
  startDateRaw: string | null,
  targetDateRaw: string | null
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await requireOwnerOrAdmin(projectId, session.user.id))) return;

  const startDate = startDateRaw ? new Date(startDateRaw) : null;
  const targetDate = targetDateRaw ? new Date(targetDateRaw) : null;

  const existingTarget = await prisma.phaseTarget.findUnique({ where: { projectId_phase: { projectId, phase } } });
  const wasEmpty = !existingTarget || (!existingTarget.startDate && !existingTarget.targetDate);

  await prisma.phaseTarget.upsert({
    where: { projectId_phase: { projectId, phase } },
    create: { projectId, phase, startDate, targetDate },
    update: { startDate, targetDate },
  });

  if (wasEmpty && (startDate || targetDate)) {
    await seedChecklistItemDatesFromPhase(projectId, phase, startDate, targetDate);
  }

  revalidatePath(`/projects/${slug}/roadmap`);
  revalidatePath(`/projects/${slug}`);
}
