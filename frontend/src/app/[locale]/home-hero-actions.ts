"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";
import { Prisma } from "@prisma/client";
import type { HomeHeroSlide } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  return requireSiteAdmin(session.user.id);
}

export type ObstacleInput = { lead: string; text: string };
export type PointInput = { pct: string; text: string };

export type HeroSlideInput = {
  imageUrl: string;
  alt: string;
  heading: string;
  body: string;
  bodyLine2: string;
  body2: string;
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

  return {
    imageUrl,
    alt,
    heading,
    body,
    bodyLine2: input.bodyLine2.trim() || null,
    body2: input.body2.trim() || null,
    obstacles: obstacles.length ? (obstacles as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
    outro: input.outro.trim() || null,
    points: points.length ? (points as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
    menuLabel,
    tintColor: input.tintColor,
    tintOpacity: input.tintOpacity,
  };
}

type SaveResult = { error: string } | { ok: true; slide: HomeHeroSlide };

export async function createHeroSlide(input: HeroSlideInput): Promise<SaveResult> {
  await requireAdmin();

  const data = toData(input);
  if (!data) return { error: "Bild, alt-text, rubrik, text och menyetikett krävs." };

  const last = await prisma.homeHeroSlide.findFirst({ orderBy: { order: "desc" } });
  const slide = await prisma.homeHeroSlide.create({
    data: { ...data, order: (last?.order ?? -1) + 1 },
  });

  revalidatePath("/");
  return { ok: true, slide };
}

export async function updateHeroSlide(id: string, input: HeroSlideInput): Promise<SaveResult> {
  await requireAdmin();

  const data = toData(input);
  if (!data) return { error: "Bild, alt-text, rubrik, text och menyetikett krävs." };

  const slide = await prisma.homeHeroSlide.update({ where: { id }, data });

  revalidatePath("/");
  return { ok: true, slide };
}

export async function deleteHeroSlide(id: string) {
  await requireAdmin();
  await prisma.homeHeroSlide.delete({ where: { id } });

  revalidatePath("/");
  return { ok: true };
}

export async function reorderHeroSlides(orderedIds: string[]) {
  await requireAdmin();
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.homeHeroSlide.update({ where: { id }, data: { order: index } }))
  );

  revalidatePath("/");
  return { ok: true };
}
