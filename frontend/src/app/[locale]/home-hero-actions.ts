"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/authz";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import type { HomeHeroSlide } from "@prisma/client";
import type { Locale } from "next-intl";

// Kept for HeroSlideData's shape (src/lib/heroSlides.ts) even though the
// editor no longer exposes them — see the note on saveHomeHeroContent below.
export type ObstacleInput = { lead: string; text: string };
export type PointInput = { pct: string; text: string };

type SaveResult = { error: string } | { ok: true; slide: HomeHeroSlide };

// The 2026-08 homepage redesign collapsed the hero down to a single
// heading + body (HomeHero.tsx reads only homeHeroSlide.findFirst()) — the
// other HomeHeroSlide columns (imageUrl/alt/bodyLine2/obstacles/outro/
// points/menuLabel/tint) are dead weight from the old multi-slide,
// tilted-photo-card hero this replaced, and nothing renders them anymore.
// This is the editor's actual save path now: only heading/body are exposed
// in the UI, and a brand-new slide gets inert placeholder values for the
// still-NOT-NULL legacy columns rather than surfacing them for an admin to
// fill in.
const LEGACY_FIELD_DEFAULTS = {
  imageUrl: "/img/goodtribes-mark.svg",
  alt: "",
  menuLabel: "Hero",
  tintColor: "CORAL" as const,
  tintOpacity: 10 as const,
};

export async function saveHomeHeroContent(id: string | null, heading: string, body: string, locale: Locale): Promise<SaveResult> {
  await requireAdminSession();

  const trimmedHeading = heading.trim();
  const trimmedBody = body.trim();
  if (!trimmedHeading || !trimmedBody) return { error: "Rubrik och text krävs." };

  const data = { heading: trimmedHeading, body: sanitizeHtml(trimmedBody) };

  const slide = id
    ? await prisma.homeHeroSlide.update({ where: { id }, data })
    : await prisma.homeHeroSlide.create({ data: { ...data, ...LEGACY_FIELD_DEFAULTS, locale, order: 0 } });

  revalidatePath("/");
  return { ok: true, slide };
}
