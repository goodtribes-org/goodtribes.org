"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { createNotification } from "@/lib/notify";
import { canManageChallenges, uniqueChallengeSlug } from "@/lib/challenges";

export type ChallengeInput = {
  title: string;
  description: string;
  supportText: string;
  // yyyy-mm-dd; ideas can be shared through the end of that day.
  closesOn: string;
  imageUrl: string;
};

type Result = { ok: true; slug: string } | { error: "not_allowed" | "title" | "date" | "not_found" };

const MAX_TITLE = 200;
const MAX_SUPPORT = 1000;

// End of the chosen day, Swedish time is close enough: 23:59 UTC.
function parseClosesOn(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T23:59:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

function clean(input: ChallengeInput) {
  const title = input.title.trim().slice(0, MAX_TITLE);
  const closesAt = parseClosesOn(input.closesOn);
  return {
    title,
    closesAt,
    description: sanitizeHtml(input.description).trim() || null,
    supportText: input.supportText.trim().slice(0, MAX_SUPPORT) || null,
    imageUrl: input.imageUrl.trim() || null,
  };
}

async function userId() {
  return (await auth())?.user?.id ?? null;
}

// A new challenge starts as a draft only the organisation's leads see.
export async function createChallenge(orgSlug: string, input: ChallengeInput): Promise<Result> {
  const uid = await userId();
  const org = await prisma.organisation.findUnique({ where: { slug: orgSlug }, select: { id: true, slug: true, verified: true } });
  if (!org || !(await canManageChallenges(org, uid))) return { error: "not_allowed" };
  const data = clean(input);
  if (data.title.length < 5) return { error: "title" };
  if (!data.closesAt || data.closesAt.getTime() <= Date.now()) return { error: "date" };

  const challenge = await prisma.challenge.create({
    data: { ...data, closesAt: data.closesAt, slug: await uniqueChallengeSlug(data.title), organisationId: org.id, createdById: uid! },
    select: { slug: true },
  });
  revalidatePath(`/org/${org.slug}`);
  return { ok: true, slug: challenge.slug };
}

async function managed(slug: string) {
  const uid = await userId();
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, publishedAt: true, closesAt: true, organisation: { select: { id: true, slug: true, name: true, verified: true } } },
  });
  if (!challenge || !(await canManageChallenges(challenge.organisation, uid))) return null;
  return { challenge, uid: uid! };
}

export async function updateChallenge(slug: string, input: ChallengeInput): Promise<Result> {
  const m = await managed(slug);
  if (!m) return { error: "not_allowed" };
  const data = clean(input);
  if (data.title.length < 5) return { error: "title" };
  if (!data.closesAt) return { error: "date" };
  await prisma.challenge.update({ where: { id: m.challenge.id }, data: { ...data, closesAt: data.closesAt } });
  revalidatePath(`/challenges/${slug}`);
  revalidatePath("/challenges");
  return { ok: true, slug };
}

// Publishing opens the challenge for ideas, and tells the organisation's
// members (there's no "follow an organisation" yet to reach further).
export async function publishChallenge(slug: string): Promise<Result> {
  const m = await managed(slug);
  if (!m) return { error: "not_allowed" };
  if (m.challenge.publishedAt) return { ok: true, slug };
  if (m.challenge.closesAt.getTime() <= Date.now()) return { error: "date" };

  await prisma.challenge.update({ where: { id: m.challenge.id }, data: { publishedAt: new Date() } });
  const members = await prisma.organisationMember.findMany({ where: { organisationId: m.challenge.organisation.id }, select: { userId: true } });
  await Promise.all(
    members
      .filter((x) => x.userId !== m.uid)
      .map((x) =>
        createNotification({
          userId: x.userId,
          type: "challenge_published",
          title: `${m.challenge.organisation.name} har en ny utmaning: "${m.challenge.title}"`,
          url: `/challenges/${slug}`,
        }).catch(() => {}),
      ),
  );
  revalidatePath(`/challenges/${slug}`);
  revalidatePath("/challenges");
  revalidatePath(`/org/${m.challenge.organisation.slug}`);
  revalidatePath("/");
  return { ok: true, slug };
}

// Lift an idea out as one of the challenge's best, or put it back. A
// pointer for the reader, never a gate: every idea can still be driven.
export async function setIdeaFeatured(slug: string, ideaId: string, featured: boolean): Promise<Result> {
  const m = await managed(slug);
  if (!m) return { error: "not_allowed" };
  const updated = await prisma.idea.updateMany({
    where: { id: ideaId, challengeId: m.challenge.id },
    data: { challengeFeaturedAt: featured ? new Date() : null },
  });
  if (updated.count === 0) return { error: "not_found" };
  revalidatePath(`/challenges/${slug}`);
  return { ok: true, slug };
}
