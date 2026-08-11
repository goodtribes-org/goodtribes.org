"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/authz";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { Prisma } from "@prisma/client";
import type { HomeHeroSlide } from "@prisma/client";
import type { Locale } from "next-intl";

export type ObstacleInput = { lead: string; text: string };
export type PointInput = { pct: string; text: string };

export type HeroSlideInput = {
  imageUrl: string;
  alt: string;
  heading: string;
  body: string;
  bodyLine2: string;
  obstacles: ObstacleInput[];
  outro: string;
  points: PointInput[];
  menuLabel: string;
  tintColor: "CORAL" | "SEAGRASS" | "MUTED_TEAL" | "DRY_SAGE" | "WATERMELON";
  tintOpacity: 10 | 15 | 20;
};

function toData(input: HeroSlideInput) {
  const heading = input.heading.trim();
  const body = input.body.trim();
  const imageUrl = input.imageUrl.trim();
  const alt = input.alt.trim();
  const menuLabel = input.menuLabel.trim();
  if (!heading || !body || !imageUrl || !alt || !menuLabel) return null;

  const obstacles = input.obstacles.filter((o) => o.lead.trim() || o.text.trim());
  const points = input.points.filter((p) => p.pct.trim() || p.text.trim());

  const outro = input.outro.trim();

  return {
    imageUrl,
    alt,
    heading,
    body: sanitizeHtml(body),
    bodyLine2: input.bodyLine2.trim() || null,
    obstacles: obstacles.length ? (obstacles as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
    outro: outro ? sanitizeHtml(outro) : null,
    points: points.length ? (points as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
    menuLabel,
    tintColor: input.tintColor,
    tintOpacity: input.tintOpacity,
  };
}

type SaveResult = { error: string } | { ok: true; slide: HomeHeroSlide };

// locale is the locale the admin was viewing/editing when they hit save —
// each locale keeps its own independent set of slides (a slide only exists
// in the locale it was created under; there's no shared image/order link
// between a Swedish and English slide the way SitePage links translations
// of "the same" page).
export async function createHeroSlide(input: HeroSlideInput, locale: Locale): Promise<SaveResult> {
  await requireAdminSession();

  const data = toData(input);
  if (!data) return { error: "Bild, alt-text, rubrik, text och menyetikett krävs." };

  const last = await prisma.homeHeroSlide.findFirst({ where: { locale }, orderBy: { order: "desc" } });
  const slide = await prisma.homeHeroSlide.create({
    data: { ...data, locale, order: (last?.order ?? -1) + 1 },
  });

  revalidatePath("/");
  return { ok: true, slide };
}

export async function updateHeroSlide(id: string, input: HeroSlideInput): Promise<SaveResult> {
  await requireAdminSession();

  const data = toData(input);
  if (!data) return { error: "Bild, alt-text, rubrik, text och menyetikett krävs." };

  const slide = await prisma.homeHeroSlide.update({ where: { id }, data });

  revalidatePath("/");
  return { ok: true, slide };
}

export async function deleteHeroSlide(id: string) {
  await requireAdminSession();
  await prisma.homeHeroSlide.delete({ where: { id } });

  revalidatePath("/");
  return { ok: true };
}

export async function reorderHeroSlides(orderedIds: string[]) {
  await requireAdminSession();
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.homeHeroSlide.update({ where: { id }, data: { order: index } }))
  );

  revalidatePath("/");
  return { ok: true };
}

type OkOrError = { error: string } | { ok: true };

export async function updateHeroHeading(heading: string, locale: Locale): Promise<OkOrError> {
  await requireAdminSession();

  const trimmed = heading.trim();
  if (!trimmed) return { error: "Rubrik krävs." };

  await prisma.homeHeroSettings.upsert({
    where: { locale },
    update: { heading: trimmed },
    create: { locale, heading: trimmed },
  });

  revalidatePath("/");
  return { ok: true };
}

export type OnboardingStepInput = { order: number; label: string; href: string };

// Upserts by (order, locale) rather than updating an existing row by id —
// the six steps are a fixed set per locale, but a locale that has never
// been translated yet has zero rows, so the first save for that locale
// needs to create them rather than fail to find something to update.
export async function updateOnboardingSteps(steps: OnboardingStepInput[], locale: Locale): Promise<OkOrError> {
  await requireAdminSession();

  for (const s of steps) {
    if (!s.label.trim() || !s.href.trim()) return { error: "Text och länk krävs för varje steg." };
  }

  await prisma.$transaction(
    steps.map((s) =>
      prisma.onboardingStep.upsert({
        where: { order_locale: { order: s.order, locale } },
        update: { label: s.label.trim(), href: s.href.trim() },
        create: { order: s.order, locale, label: s.label.trim(), href: s.href.trim() },
      })
    )
  );

  revalidatePath("/");
  return { ok: true };
}
