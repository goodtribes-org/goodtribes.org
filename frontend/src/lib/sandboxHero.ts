import type { SandboxHeroSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import type { Locale } from "next-intl";

export type SandboxHeroData = {
  heroKicker: string;
  heroDescription: string;
  headings: { levaGott: string; maGott: string; goraGott: string; dreamGood: string };
  bodies: { levaGott: string; maGott: string; goraGott: string; dreamGood: string };
};

// Sanitizes the HTML body fields again at render time (belt-and-suspenders,
// same as HomeHeroSlide/SitePage) so rows saved before sanitizeHtml was
// added on write can't still serve stored XSS.
function toSandboxHeroData(s: SandboxHeroSettings): SandboxHeroData {
  return {
    heroKicker: s.heroKicker,
    heroDescription: sanitizeHtml(s.heroDescription),
    headings: {
      levaGott: s.levaGottHeading,
      maGott: s.maGottHeading,
      goraGott: s.goraGottHeading,
      dreamGood: s.dreamGoodHeading,
    },
    bodies: {
      levaGott: sanitizeHtml(s.levaGottBody),
      maGott: sanitizeHtml(s.maGottBody),
      goraGott: sanitizeHtml(s.goraGottBody),
      dreamGood: sanitizeHtml(s.dreamGoodBody),
    },
  };
}

// Every shipped locale gets a seeded row via the migration, so this should
// always hit the first branch — the default-locale fallback and hardcoded
// placeholder only guard against a row having been deleted directly in the
// database, same defensive shape as the hero-carousel admin page's fallback.
export async function getSandboxHero(locale: string): Promise<SandboxHeroData> {
  const row = await prisma.sandboxHeroSettings.findUnique({ where: { locale } });
  if (row) return toSandboxHeroData(row);

  if (locale !== routing.defaultLocale) {
    const fallback = await prisma.sandboxHeroSettings.findUnique({ where: { locale: routing.defaultLocale } });
    if (fallback) return toSandboxHeroData(fallback);
  }

  return {
    heroKicker: "Drömfabriken",
    heroDescription: "",
    headings: { levaGott: "Leva Gott", maGott: "Må Gott", goraGott: "Göra Gott", dreamGood: "Dröm stort" },
    bodies: { levaGott: "", maGott: "", goraGott: "", dreamGood: "" },
  };
}

// Same draft-prefill idea as the hero-carousel admin page: an untranslated
// locale's editor should start from the default locale's content rather
// than a blank form, but saving only ever writes this locale's own row.
export async function getSandboxHeroDraft(locale: Locale): Promise<SandboxHeroSettings | null> {
  const row = await prisma.sandboxHeroSettings.findUnique({ where: { locale } });
  if (row) return row;
  if (locale === routing.defaultLocale) return null;
  return prisma.sandboxHeroSettings.findUnique({ where: { locale: routing.defaultLocale } });
}
