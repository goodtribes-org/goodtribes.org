"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/authz";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import type { Locale } from "next-intl";

type OkOrError = { error: string } | { ok: true };

export type AboutPillarsInput = {
  levaGottHeading: string;
  levaGottBody: string;
  maGottHeading: string;
  maGottBody: string;
  goraGottHeading: string;
  goraGottBody: string;
  dreamGoodHeading: string;
  dreamGoodBody: string;
};

const REQUIRED_FIELDS: (keyof AboutPillarsInput)[] = [
  "levaGottHeading",
  "levaGottBody",
  "maGottHeading",
  "maGottBody",
  "goraGottHeading",
  "goraGottBody",
  "dreamGoodHeading",
  "dreamGoodBody",
];

// The four *Body fields are edited via RichTextEditor, so they arrive as
// HTML — sanitize before storing, same rule as HomeHeroSlide's body/outro.
// Headings stay plain single-line labels.
const HTML_FIELDS: (keyof AboutPillarsInput)[] = ["levaGottBody", "maGottBody", "goraGottBody", "dreamGoodBody"];

export async function updateAboutPillars(input: AboutPillarsInput, locale: Locale): Promise<OkOrError> {
  await requireAdminSession();

  const trimmed = Object.fromEntries(
    REQUIRED_FIELDS.map((key) => [
      key,
      HTML_FIELDS.includes(key) ? sanitizeHtml(input[key]).trim() : input[key].trim(),
    ])
  ) as AboutPillarsInput;

  for (const key of REQUIRED_FIELDS) {
    if (!trimmed[key]) return { error: "Alla fält krävs." };
  }

  // The row still has Drömfabriken's old kicker/description columns (see
  // lib/aboutPillars.ts); a new locale's row just leaves them empty.
  await prisma.sandboxHeroSettings.upsert({
    where: { locale },
    update: trimmed,
    create: { locale, heroKicker: "", heroDescription: "", ...trimmed },
  });

  revalidatePath("/about");
  return { ok: true };
}
