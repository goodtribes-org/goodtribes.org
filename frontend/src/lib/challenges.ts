import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSiteAdmin } from "@/lib/authz";
import { hasOrgRole, ORG_LEAD_ROLES } from "@/lib/org-authz";
import { slugify } from "@/lib/slugify";

// Utmaningar (#228). An organisation's question with a deadline; ideas
// shared as answers are ordinary ideas that anyone can drive.

const DAY = 24 * 60 * 60 * 1000;

// Published and not hidden behind its organisation being private.
export const PUBLIC_CHALLENGE_WHERE = {
  publishedAt: { not: null },
  organisation: { isPublic: true },
} satisfies Prisma.ChallengeWhereInput;

export type ChallengeStage = "draft" | "open" | "selecting" | "closed";

// Where a challenge is, from its dates and featured ideas — never stored,
// so it can't drift (see the Challenge model). After the deadline the
// organisation may lift out some ideas ("selecting" until it has); without
// that the challenge is simply closed. Every idea stays free to drive.
export function challengeStage(
  c: { publishedAt: Date | null; closesAt: Date },
  featuredCount: number,
  now = Date.now(),
): ChallengeStage {
  if (!c.publishedAt) return "draft";
  if (c.closesAt.getTime() > now) return "open";
  return featuredCount > 0 ? "closed" : "selecting";
}

export function isOpenForIdeas(c: { publishedAt: Date | null; closesAt: Date }, now = Date.now()): boolean {
  return !!c.publishedAt && c.closesAt.getTime() > now;
}

// Whole days left, rounded up ("1 dag kvar" on the last day).
export function daysLeft(closesAt: Date, now = Date.now()): number {
  return Math.max(0, Math.ceil((closesAt.getTime() - now) / DAY));
}

// Who may create and run a challenge: the owners and admins of a verified
// organisation (Niklas, 2026-10-06), and site admins.
export async function canManageChallenges(org: { id: string; verified: boolean }, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  if (await isSiteAdmin(userId)) return true;
  return org.verified && (await hasOrgRole(org.id, userId, ORG_LEAD_ROLES));
}

export async function uniqueChallengeSlug(title: string): Promise<string> {
  const base = slugify(title).slice(0, 80) || "utmaning";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await prisma.challenge.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// The open challenge a shared idea answers, or null when it's closed,
// unpublished or doesn't exist — then the idea is just an idea.
export async function openChallengeBySlug(slug: string | undefined) {
  if (!slug) return null;
  const c = await prisma.challenge.findFirst({
    where: { slug, ...PUBLIC_CHALLENGE_WHERE },
    select: { id: true, slug: true, title: true, closesAt: true, publishedAt: true, organisation: { select: { name: true } } },
  });
  return c && isOpenForIdeas(c) ? c : null;
}

// What a challenge card needs (start page, /challenges, organisation page).
export const CHALLENGE_CARD_SELECT = {
  slug: true,
  title: true,
  imageUrl: true,
  supportText: true,
  closesAt: true,
  publishedAt: true,
  organisation: { select: { name: true, slug: true } },
  _count: { select: { ideas: { where: { hiddenAt: null, status: { not: "draft" } } } } },
} satisfies Prisma.ChallengeSelect;
