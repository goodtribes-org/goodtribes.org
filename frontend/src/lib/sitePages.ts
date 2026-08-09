import { prisma } from "@/lib/prisma";
import { DEFAULT_SITE_PAGES } from "@/lib/defaultSitePages";
import type { SitePageSlug } from "@/app/[locale]/site-pages-actions";
import type { Locale } from "next-intl";
import { routing } from "@/i18n/routing";

export interface SitePageContent {
  title: string;
  body: string;
}

/**
 * Reads editorial content for a static page (About/Privacy/Terms, or a
 * footer-created custom page) saved via the inline edit pencil (see
 * EditableSitePage.tsx). Falls back from the requested locale to the site's
 * default locale (sv) if no row exists yet for that locale — e.g. a custom
 * page an admin only ever wrote in Swedish still renders for an English
 * visitor instead of 404ing. Returns null only when neither locale has a
 * row, so callers can fall back further to hardcoded copy (see
 * DEFAULT_SITE_PAGES) for the three fixed slugs.
 */
export async function getSitePage(slug: string, locale: Locale): Promise<SitePageContent | null> {
  const page = await prisma.sitePage.findUnique({ where: { slug_locale: { slug, locale } } });
  if (page) return { title: page.title, body: page.body };

  if (locale !== routing.defaultLocale) {
    const fallback = await prisma.sitePage.findUnique({
      where: { slug_locale: { slug, locale: routing.defaultLocale } },
    });
    if (fallback) return { title: fallback.title, body: fallback.body };
  }

  return null;
}

export interface FooterPage {
  slug: string;
  title: string;
  href: string;
  locked: boolean;
}

// Fixed pages always keep their own routes and a default footer position
// even before a site admin has saved a first edit (see getSitePage above) —
// a DB row (from an edit, or from being reordered) overrides title/order.
const FIXED_FOOTER_META: Record<SitePageSlug, { href: string; order: number }> = {
  about: { href: "/about", order: -3 },
  privacy: { href: "/privacy", order: -2 },
  terms: { href: "/terms", order: -1 },
  "participant-agreement": { href: "/participant-agreement", order: -0.5 },
  "code-of-conduct": { href: "/code-of-conduct", order: 0 },
};

type FooterRow = { slug: string; title: string; order: number };

/**
 * The ordered list of editorial pages to link from the footer: the three
 * fixed pages plus any custom pages a site admin has added (see
 * createFooterPage in site-pages-actions.ts). `locked` pages can't be
 * removed from the footer manager, only reordered. Same locale fallback
 * chain as getSitePage — a custom page only written in the default locale
 * still shows up (using that locale's title) in another locale's footer.
 */
export async function getFooterPages(locale: Locale): Promise<FooterPage[]> {
  const rows = await prisma.sitePage.findMany({ where: { locale }, select: { slug: true, title: true, order: true } });
  const bySlug = new Map<string, FooterRow>(rows.map((r) => [r.slug, r]));

  const fallbackRows: FooterRow[] =
    locale !== routing.defaultLocale
      ? await prisma.sitePage.findMany({
          where: { locale: routing.defaultLocale },
          select: { slug: true, title: true, order: true },
        })
      : [];
  const fallbackBySlug = new Map<string, FooterRow>(fallbackRows.map((r) => [r.slug, r]));

  const fixed = (Object.keys(FIXED_FOOTER_META) as SitePageSlug[]).map((slug) => {
    const meta = FIXED_FOOTER_META[slug];
    const row = bySlug.get(slug) ?? fallbackBySlug.get(slug);
    return {
      slug,
      href: meta.href,
      locked: true,
      title: row?.title ?? DEFAULT_SITE_PAGES[slug][locale].title,
      order: row?.order ?? meta.order,
    };
  });

  const allCustomSlugs = new Set(
    [...rows, ...fallbackRows].map((r) => r.slug).filter((slug) => !(slug in FIXED_FOOTER_META))
  );
  const custom = [...allCustomSlugs].map((slug) => {
    const row = (bySlug.get(slug) ?? fallbackBySlug.get(slug))!;
    return { slug, href: `/pages/${slug}`, locked: false, title: row.title, order: row.order };
  });

  return [...fixed, ...custom].sort((a, b) => a.order - b.order);
}
