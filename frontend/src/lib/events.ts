import type { EventActionType } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Eventläge (#281). The QR link (/api/e/<code>) sets EVENT_COOKIE; while it's
// there, what someone does is logged against the evening: a dream from
// Drömguiden, a first task opened in it, a first task taken or signed up for
// in someone else's dream. The evening's page shows each person their three
// steps, and the big screen counts them. Logging is best-effort: it never
// stops the thing itself from happening.

export const EVENT_COOKIE = "gt_event";
export const EVENT_COOKIE_HOURS = 12;

export type ActiveEvent = { id: string; code: string; title: string };

export function normalizeEventCode(code: string): string {
  return code.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
}

export async function getEventByCode(code: string) {
  return prisma.event.findUnique({ where: { code: normalizeEventCode(code) }, select: { id: true, code: true, title: true, startsAt: true, endsAt: true } });
}

// The evening the visitor came from, if it hasn't ended (with a few hours'
// grace for people finishing at home afterwards).
export async function getActiveEvent(): Promise<ActiveEvent | null> {
  const code = (await cookies()).get(EVENT_COOKIE)?.value;
  if (!code) return null;
  const event = await getEventByCode(code);
  if (!event) return null;
  if (event.endsAt && event.endsAt.getTime() + 6 * 60 * 60 * 1000 < Date.now()) return null;
  return { id: event.id, code: event.code, title: event.title };
}

// Logs once per person, type and project/card.
export async function logEventAction(type: EventActionType, userId: string, ref: { projectId?: string; cardId?: string }): Promise<void> {
  try {
    const event = await getActiveEvent();
    if (!event) return;
    const where = { eventId: event.id, userId, type, ...(ref.cardId ? { cardId: ref.cardId } : ref.projectId ? { projectId: ref.projectId } : {}) };
    if (await prisma.eventAction.findFirst({ where, select: { id: true } })) return;
    await prisma.eventAction.create({ data: { eventId: event.id, userId, type, projectId: ref.projectId ?? null, cardId: ref.cardId ?? null } });
  } catch {
    // best-effort — never block the action itself
  }
}

export type EventProgress = {
  dreams: { id: string; slug: string; title: string; publishedAt: Date | null }[];
  openedTask: boolean;
  helped: boolean;
};

export async function getEventProgress(eventId: string, userId: string): Promise<EventProgress> {
  const actions = await prisma.eventAction.findMany({
    where: { eventId, userId },
    select: { type: true, project: { select: { id: true, slug: true, title: true, publishedAt: true, hiddenAt: true } } },
  });
  const dreams = actions
    .filter((a) => a.type === "DREAM" && a.project && !a.project.hiddenAt)
    .map((a) => ({ id: a.project!.id, slug: a.project!.slug, title: a.project!.title, publishedAt: a.project!.publishedAt }));
  return {
    dreams,
    openedTask: actions.some((a) => a.type === "FIRST_TASK"),
    helped: actions.some((a) => a.type === "OFFER" || a.type === "TAKE"),
  };
}

// The projects dreamt up during the evening, for "help someone in the room".
export async function getEventProjectIds(eventId: string): Promise<string[]> {
  const rows = await prisma.eventAction.findMany({ where: { eventId, type: "DREAM", projectId: { not: null } }, select: { projectId: true }, distinct: ["projectId"] });
  return rows.map((r) => r.projectId!);
}

export type EventFeedItem = { id: string; type: EventActionType; who: string | null; project: string | null; task: string | null; at: Date };

export async function getEventStats(eventId: string): Promise<{ dreams: number; firstTasks: number; offers: number; latest: EventFeedItem[] }> {
  const [grouped, latest] = await Promise.all([
    prisma.eventAction.groupBy({ by: ["type"], where: { eventId }, _count: { _all: true } }),
    prisma.eventAction.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true, type: true, createdAt: true,
        user: { select: { name: true } },
        project: { select: { title: true } },
        card: { select: { title: true, project: { select: { title: true } } } },
      },
    }),
  ]);
  const count = (t: EventActionType) => grouped.find((g) => g.type === t)?._count._all ?? 0;
  return {
    dreams: count("DREAM"),
    firstTasks: count("FIRST_TASK"),
    offers: count("OFFER") + count("TAKE"),
    latest: latest.map((a) => ({
      id: a.id,
      type: a.type,
      // First names only on a screen in a room.
      who: a.user.name?.split(" ")[0] ?? null,
      project: a.card?.project.title ?? a.project?.title ?? null,
      task: a.card?.title ?? null,
      at: a.createdAt,
    })),
  };
}
