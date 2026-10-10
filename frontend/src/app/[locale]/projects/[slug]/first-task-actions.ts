"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { logActivity } from "@/lib/activity";
import { publishToKanban } from "@/lib/redis";
import { hasProjectRole, isExcludedFromProject, isRealMember, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { getTrackRecords, isOpenFirstTask, MAX_OFFER_TEXT, offersFull, parseFirstTaskFields } from "@/lib/firstTasks";

// Första uppgifter (#277): open a card for someone from outside, take it or
// sign up for it, and — when the leads choose — pick one. Taking a card is
// the same assignment claimCard makes; tokens come later, when the card lands
// in Done through moveKanbanCard, as for every card.

type Result = { ok: true } | { error: string };

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, MAX_OFFER_TEXT) : null);

async function sessionUser() {
  const session = await auth();
  return session?.user?.id ? { id: session.user.id, name: session.user.name ?? null } : null;
}

async function cardWithProject(cardId: string) {
  return prisma.kanbanCard.findUnique({
    where: { id: cardId },
    select: {
      id: true, title: true, projectSlug: true, openToPublic: true, assigneeId: true, column: true, source: true,
      firstTaskChoose: true, firstTaskMaxOffers: true, firstTaskQuestion: true,
      project: {
        select: {
          id: true, title: true, publishedAt: true,
          members: { where: { role: { in: PROJECT_LEAD_ROLES } }, select: { userId: true } },
        },
      },
    },
  });
}

function refresh(slug: string) {
  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/projects/${slug}/tasks`);
}

// Whoever takes a first task follows the project from then on (unless they're
// already in it), so its news reaches them.
async function followProject(projectId: string, userId: string) {
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, role: "FOLLOWER" },
    update: {},
  });
}

// Leads only: open (or close) a card as a first task, with its helper-facing fields.
export async function saveFirstTask(cardId: string, open: boolean, raw: unknown): Promise<Result> {
  const user = await sessionUser();
  if (!user) return { error: "Not logged in" };
  const card = await cardWithProject(cardId);
  if (!card) return { error: "Card not found" };
  if (card.source === "github") return { error: "GitHub cards are read-only" };
  if (!(await hasProjectRole(card.project.id, user.id, PROJECT_LEAD_ROLES))) return { error: "Not authorized" };

  const f = parseFirstTaskFields(raw);
  const updated = await prisma.kanbanCard.update({
    where: { id: cardId },
    data: {
      openToPublic: open,
      firstTaskWhy: f.why,
      firstTaskTime: f.time,
      firstTaskPlace: f.place,
      firstTaskChoose: f.choose,
      firstTaskQuestion: f.question,
      firstTaskMaxOffers: f.maxOffers,
    },
  });
  publishToKanban(card.projectSlug, { action: "updated", card: updated });
  refresh(card.projectSlug);
  return { ok: true };
}

// Shared checks before someone from outside takes or signs up.
async function checkHelper(card: NonNullable<Awaited<ReturnType<typeof cardWithProject>>>, userId: string): Promise<string | null> {
  if (!card.project.publishedAt) return "Not found";
  if (!isOpenFirstTask(card)) return "This task isn't open any more";
  if (await isRealMember(card.project.id, userId)) return "Members take tasks on the board";
  if (await isExcludedFromProject(userId, card.project.id)) return "Forbidden";
  return null;
}

// First come, first served: the card is yours.
export async function takeFirstTask(cardId: string, message: unknown): Promise<Result> {
  const user = await sessionUser();
  if (!user) return { error: "Not logged in" };
  const card = await cardWithProject(cardId);
  if (!card) return { error: "Card not found" };
  if (card.firstTaskChoose) return { error: "The project chooses among sign-ups" };
  const problem = await checkHelper(card, user.id);
  if (problem) return { error: problem };

  const claimed = await prisma.kanbanCard.updateMany({
    where: { id: cardId, assigneeId: null, openToPublic: true },
    data: { assigneeId: user.id, claimedAt: new Date() },
  });
  if (claimed.count === 0) return { error: "Someone already took this task" };
  await followProject(card.project.id, user.id);

  const t = await getTranslations("FirstTasks");
  const note = text(message);
  await logActivity(card.project.id, user.id, "task_claimed", { title: card.title, cardId: card.id });
  await Promise.all(
    card.project.members.map((m) =>
      createNotification({
        userId: m.userId,
        type: "task_claimed",
        title: t("notifyTaken", { name: user.name ?? t("someone"), task: card.title }),
        body: note ?? undefined,
        url: `/projects/${card.projectSlug}/tasks?card=${card.id}`,
      }),
    ),
  );
  const updated = await prisma.kanbanCard.findUnique({ where: { id: cardId } });
  publishToKanban(card.projectSlug, { action: "updated", card: updated });
  refresh(card.projectSlug);
  return { ok: true };
}

// The leads choose: sign up, with an answer to their question.
export async function offerFirstTask(cardId: string, answer: unknown, message: unknown): Promise<Result> {
  const user = await sessionUser();
  if (!user) return { error: "Not logged in" };
  const card = await cardWithProject(cardId);
  if (!card) return { error: "Card not found" };
  if (!card.firstTaskChoose) return { error: "Take the task directly" };
  const problem = await checkHelper(card, user.id);
  if (problem) return { error: problem };
  const existing = await prisma.taskOffer.findUnique({ where: { cardId_userId: { cardId, userId: user.id } }, select: { status: true } });
  if (existing?.status === "PENDING" || existing?.status === "CHOSEN") return { ok: true };
  const pending = await prisma.taskOffer.count({ where: { cardId, status: "PENDING" } });
  if (offersFull(card, pending)) return { error: "This task has enough sign-ups" };

  const data = { answer: card.firstTaskQuestion ? text(answer) : null, message: text(message), status: "PENDING" as const, decidedAt: null };
  await prisma.taskOffer.upsert({
    where: { cardId_userId: { cardId, userId: user.id } },
    create: { cardId, userId: user.id, ...data },
    update: data,
  });
  await followProject(card.project.id, user.id);

  const t = await getTranslations("FirstTasks");
  await Promise.all(
    card.project.members.map((m) =>
      createNotification({
        userId: m.userId,
        type: "task_offer",
        title: t("notifyOffer", { name: user.name ?? t("someone"), task: card.title }),
        body: data.answer ?? data.message ?? undefined,
        url: `/projects/${card.projectSlug}/tasks?card=${card.id}`,
      }),
    ),
  );
  refresh(card.projectSlug);
  return { ok: true };
}

export async function withdrawOffer(cardId: string): Promise<Result> {
  const user = await sessionUser();
  if (!user) return { error: "Not logged in" };
  const res = await prisma.taskOffer.updateMany({ where: { cardId, userId: user.id, status: "PENDING" }, data: { status: "WITHDRAWN", decidedAt: new Date() } });
  if (res.count === 0) return { error: "No sign-up to withdraw" };
  const card = await prisma.kanbanCard.findUnique({ where: { id: cardId }, select: { projectSlug: true } });
  if (card) refresh(card.projectSlug);
  return { ok: true };
}

// Leads only: pick one sign-up. They get the card; everyone else still waiting
// is thanked, so nobody is left hanging and no lead has to write a "no".
export async function chooseOffer(offerId: string): Promise<Result> {
  const user = await sessionUser();
  if (!user) return { error: "Not logged in" };
  const offer = await prisma.taskOffer.findUnique({ where: { id: offerId }, select: { id: true, cardId: true, userId: true, status: true } });
  if (!offer || offer.status !== "PENDING") return { error: "Sign-up not found" };
  const card = await cardWithProject(offer.cardId);
  if (!card) return { error: "Card not found" };
  if (!(await hasProjectRole(card.project.id, user.id, PROJECT_LEAD_ROLES))) return { error: "Not authorized" };
  if (!isOpenFirstTask(card)) return { error: "This task isn't open any more" };

  const others = await prisma.$transaction(async (tx) => {
    const claimed = await tx.kanbanCard.updateMany({
      where: { id: card.id, assigneeId: null, openToPublic: true },
      data: { assigneeId: offer.userId, claimedAt: new Date() },
    });
    if (claimed.count === 0) throw new Error("taken");
    const now = new Date();
    await tx.taskOffer.update({ where: { id: offer.id }, data: { status: "CHOSEN", decidedAt: now } });
    const waiting = await tx.taskOffer.findMany({ where: { cardId: card.id, status: "PENDING" }, select: { userId: true } });
    await tx.taskOffer.updateMany({ where: { cardId: card.id, status: "PENDING" }, data: { status: "DECLINED", decidedAt: now } });
    return waiting.map((w) => w.userId);
  }).catch(() => null);
  if (others === null) return { error: "Someone already has this task" };

  const t = await getTranslations("FirstTasks");
  const url = `/projects/${card.projectSlug}`;
  await createNotification({
    userId: offer.userId,
    type: "task_offer_chosen",
    title: t("notifyChosen", { task: card.title, project: card.project.title }),
    url: `/projects/${card.projectSlug}/tasks?card=${card.id}`,
  });
  await Promise.all(
    others.map((userId) =>
      createNotification({ userId, type: "task_offer_thanks", title: t("notifyThanks", { task: card.title, project: card.project.title }), url }),
    ),
  );
  await logActivity(card.project.id, offer.userId, "task_claimed", { title: card.title, cardId: card.id });
  const updated = await prisma.kanbanCard.findUnique({ where: { id: card.id } });
  publishToKanban(card.projectSlug, { action: "updated", card: updated });
  refresh(card.projectSlug);
  return { ok: true };
}

// Leads only: a kind "not this time" to one sign-up.
export async function declineOffer(offerId: string): Promise<Result> {
  const user = await sessionUser();
  if (!user) return { error: "Not logged in" };
  const offer = await prisma.taskOffer.findUnique({ where: { id: offerId }, select: { id: true, cardId: true, userId: true, status: true } });
  if (!offer || offer.status !== "PENDING") return { error: "Sign-up not found" };
  const card = await cardWithProject(offer.cardId);
  if (!card) return { error: "Card not found" };
  if (!(await hasProjectRole(card.project.id, user.id, PROJECT_LEAD_ROLES))) return { error: "Not authorized" };

  await prisma.taskOffer.update({ where: { id: offer.id }, data: { status: "DECLINED", decidedAt: new Date() } });
  const t = await getTranslations("FirstTasks");
  await createNotification({
    userId: offer.userId,
    type: "task_offer_thanks",
    title: t("notifyThanks", { task: card.title, project: card.project.title }),
    url: `/projects/${card.projectSlug}`,
  });
  refresh(card.projectSlug);
  return { ok: true };
}

export type OfferView = {
  id: string;
  userId: string;
  name: string | null;
  image: string | null;
  answer: string | null;
  message: string | null;
  createdAt: string;
  record: { tasksDone: number; projects: number; thanked: number; since: string } | null;
};

// Leads only: the sign-ups still waiting on a card, with what each person has
// done on GoodTribes before (no ratings).
export async function listOffers(cardId: string): Promise<OfferView[] | { error: string }> {
  const user = await sessionUser();
  if (!user) return { error: "Not logged in" };
  const card = await prisma.kanbanCard.findUnique({ where: { id: cardId }, select: { project: { select: { id: true } } } });
  if (!card) return { error: "Card not found" };
  if (!(await hasProjectRole(card.project.id, user.id, PROJECT_LEAD_ROLES))) return { error: "Not authorized" };
  const offers = await prisma.taskOffer.findMany({
    where: { cardId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { id: true, answer: true, message: true, createdAt: true, userId: true, user: { select: { name: true, image: true } } },
  });
  const records = await getTrackRecords(offers.map((o) => o.userId));
  return offers.map((o) => {
    const r = records.get(o.userId);
    return {
      id: o.id,
      userId: o.userId,
      name: o.user.name,
      image: o.user.image,
      answer: o.answer,
      message: o.message,
      createdAt: o.createdAt.toISOString(),
      record: r ? { tasksDone: r.tasksDone, projects: r.projects, thanked: r.thanked, since: r.since.toISOString() } : null,
    };
  });
}
