import { prisma } from "@/lib/prisma";
import { DEFAULT_SITE_PAGES } from "@/lib/defaultSitePages";
import type { SitePageSlug } from "@/app/[locale]/site-pages-actions";

export interface SitePageContent {
  title: string;
  body: string;
}

/**
 * Reads editorial content for a static page (About/Privacy/Terms, or a
 * footer-created custom page) saved via the inline edit pencil (see
 * EditableSitePage.tsx). Returns null until a site admin has saved an edit
 * for that slug, so callers can fall back to hardcoded copy in the page
 * component — mirrors the old getStrapiPage fallback contract this replaces.
 */
export async function getSitePage(slug: string): Promise<SitePageContent | null> {
  const page = await prisma.sitePage.findUnique({ where: { slug } });
  if (!page) return null;
  return { title: page.title, body: page.body };
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
};

/**
 * The ordered list of editorial pages to link from the footer: the three
 * fixed pages plus any custom pages a site admin has added (see
 * createFooterPage in site-pages-actions.ts). `locked` pages can't be
 * removed from the footer manager, only reordered.
 */
export async function getFooterPages(): Promise<FooterPage[]> {
  const rows = await prisma.sitePage.findMany({ select: { slug: true, title: true, order: true } });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const fixed = (Object.keys(FIXED_FOOTER_META) as SitePageSlug[]).map((slug) => {
    const meta = FIXED_FOOTER_META[slug];
    const row = bySlug.get(slug);
    return {
      slug,
      href: meta.href,
      locked: true,
      title: row?.title ?? DEFAULT_SITE_PAGES[slug].title,
      order: row?.order ?? meta.order,
    };
  });

  const custom = rows
    .filter((r) => !(r.slug in FIXED_FOOTER_META))
    .map((r) => ({ slug: r.slug, href: `/pages/${r.slug}`, locked: false, title: r.title, order: r.order }));

  return [...fixed, ...custom].sort((a, b) => a.order - b.order);
}
