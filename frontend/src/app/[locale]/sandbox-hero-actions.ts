"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/authz";
import type { Locale } from "next-intl";

type OkOrError = { error: string } | { ok: true };

export type SandboxHeroInput = {
  heroKicker: string;
  heroDescription: string;
  levaGottHeading: string;
  levaGottBody: string;
  maGottHeading: string;
  maGottBody: string;
  goraGottHeading: string;
  goraGottBody: string;
  dreamGoodHeading: string;
  dreamGoodBody: string;
};

const REQUIRED_FIELDS: (keyof SandboxHeroInput)[] = [
  "heroKicker",
  "heroDescription",
  "levaGottHeading",
  "levaGottBody",
  "maGottHeading",
  "maGottBody",
  "goraGottHeading",
  "goraGottBody",
  "dreamGoodHeading",
  "dreamGoodBody",
];

export async function updateSandboxHero(input: SandboxHeroInput, locale: Locale): Promise<OkOrError> {
  await requireAdminSession();

  const trimmed = Object.fromEntries(
    REQUIRED_FIELDS.map((key) => [key, input[key].trim()])
  ) as SandboxHeroInput;

  for (const key of REQUIRED_FIELDS) {
    if (!trimmed[key]) return { error: "Alla fält krävs." };
  }

  await prisma.sandboxHeroSettings.upsert({
    where: { locale },
    update: trimmed,
    create: { locale, ...trimmed },
  });

  revalidatePath("/sandbox");
  return { ok: true };
}
