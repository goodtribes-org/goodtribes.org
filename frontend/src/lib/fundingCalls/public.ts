import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

// Utlysningar (#344): what the public sees — published calls that are still
// open (or take applications continuously), and the ideas shared to them.

export function publicCallWhere(now = new Date()) {
  return {
    status: "PUBLISHED",
    slug: { not: null },
    OR: [{ rolling: true }, { deadline: { gt: now } }],
  } satisfies Prisma.FundingCallWhereInput;
}

// What a card needs (start page, /utlysningar).
export const CALL_CARD_SELECT = {
  slug: true,
  title: true,
  imageUrl: true,
  summary: true,
  deadline: true,
  rolling: true,
  amountMinSek: true,
  amountMaxSek: true,
  applicantTypes: true,
  sdgGoals: true,
  fundingSource: { select: { name: true } },
  _count: { select: { ideas: { where: { hiddenAt: null, status: { not: "draft" } } } } },
} satisfies Prisma.FundingCallSelect;

export type CallCardData = Prisma.FundingCallGetPayload<{ select: typeof CALL_CARD_SELECT }>;

// Soonest deadline first; continuous calls after the dated ones.
export const CALL_ORDER = [{ rolling: "asc" }, { deadline: { sort: "asc", nulls: "last" } }] satisfies Prisma.FundingCallOrderByWithRelationInput[];

export async function uniqueCallSlug(title: string): Promise<string> {
  const base = slugify(title).slice(0, 80).replace(/-+$/, "") || "utlysning";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await prisma.fundingCall.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// The open call a shared idea is for, or null when it's closed or unknown —
// then the idea is just an idea.
export async function openCallBySlug(slug: string | undefined | null) {
  if (!slug) return null;
  return prisma.fundingCall.findFirst({
    where: { ...publicCallWhere(), slug },
    select: { id: true, slug: true, title: true, fundingSource: { select: { name: true } } },
  });
}

// "Upp till 500 000 kr", "100 000–2 000 000 kr" — figures as the funder gave them.
export function amountLabel(min: number | null, max: number | null, t: { upTo: string; from: string }): string | null {
  const kr = (n: number) => `${new Intl.NumberFormat("sv-SE").format(n)} kr`;
  if (min && max) return `${new Intl.NumberFormat("sv-SE").format(min)}–${kr(max)}`;
  if (max) return `${t.upTo} ${kr(max)}`;
  if (min) return `${t.from} ${kr(min)}`;
  return null;
}

// For a card's narrow cell: "500 tkr", "3 mkr", "3,5 mkr".
export function compactKr(n: number): string {
  const fmt = (v: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 }).format(v);
  if (n >= 1_000_000) return `${fmt(n / 1_000_000)} mkr`;
  if (n >= 1_000) return `${fmt(n / 1_000)} tkr`;
  return `${n} kr`;
}
