import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { logger } from "@/lib/logger";
import { PROJECT_LEAD_ROLES } from "@/lib/authz";

// Sign-ups for a first task shouldn't wait forever (#284). A week after the
// oldest pending sign-up the leads get one reminder; after two weeks the
// sign-ups are declined with thanks and the card is closed to the public, so
// a helper isn't left hanging and the task stops attracting new sign-ups.
// Run by /api/cron/first-task-reminders.

const DAY = 24 * 60 * 60 * 1000;
export const REMIND_AFTER_DAYS = 7;
export const CLOSE_AFTER_DAYS = 14;

export function staleAction(oldestPending: Date, now: Date): "none" | "remind" | "close" {
  const age = now.getTime() - oldestPending.getTime();
  if (age >= CLOSE_AFTER_DAYS * DAY) return "close";
  if (age >= REMIND_AFTER_DAYS * DAY) return "remind";
  return "none";
}

export async function runFirstTaskReminders(now = new Date()): Promise<{ reminded: number; closed: number; failed: string[] }> {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations({ locale: "sv", namespace: "FirstTasks" });
  const cards = await prisma.kanbanCard.findMany({
    where: { taskOffers: { some: { status: "PENDING", createdAt: { lte: new Date(now.getTime() - REMIND_AFTER_DAYS * DAY) } } } },
    select: {
      id: true, title: true, projectSlug: true,
      project: { select: { title: true, members: { where: { role: { in: PROJECT_LEAD_ROLES } }, select: { userId: true } } } },
      taskOffers: { where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, select: { id: true, userId: true, createdAt: true } },
    },
  });

  let reminded = 0;
  let closed = 0;
  const failed: string[] = [];
  for (const card of cards) {
    try {
      const oldest = card.taskOffers[0];
      if (!oldest) continue;
      const url = `/projects/${card.projectSlug}/tasks?card=${card.id}`;
      const action = staleAction(oldest.createdAt, now);
      if (action === "remind") {
        // Once per card: the reminder itself is the marker.
        if (await prisma.notification.findFirst({ where: { type: "first_task_offers_stale", url }, select: { id: true } })) continue;
        await Promise.all(card.project.members.map((m) =>
          createNotification({ userId: m.userId, type: "first_task_offers_stale", title: t("notifyStale", { count: card.taskOffers.length, task: card.title }), url }),
        ));
        reminded++;
      } else if (action === "close") {
        await prisma.$transaction([
          prisma.taskOffer.updateMany({ where: { cardId: card.id, status: "PENDING" }, data: { status: "DECLINED", decidedAt: now } }),
          prisma.kanbanCard.update({ where: { id: card.id }, data: { openToPublic: false } }),
        ]);
        await Promise.all(card.taskOffers.map((o) =>
          createNotification({ userId: o.userId, type: "task_offer_thanks", title: t("notifyAutoClosed", { task: card.title, project: card.project.title }), url: `/projects/${card.projectSlug}` }),
        ));
        closed++;
      }
    } catch (err) {
      logger.error("first-task reminder failed", { cardId: card.id, error: err instanceof Error ? err.message : String(err) });
      failed.push(card.id);
    }
  }
  return { reminded, closed, failed };
}
