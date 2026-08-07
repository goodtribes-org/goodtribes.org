"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { slugify } from "@/lib/slugify";
import { DEFAULT_SITE_PAGES } from "@/lib/defaultSitePages";
import type { Locale } from "next-intl";

// The three pages the app has always shipped with fixed routes for
// (/about, /privacy, /terms). They may or may not have a SitePage row yet
// for a given locale (see getSitePage's fallback contract) — when they
// don't, updateSitePage creates one on first save. Any other slug is a
// footer-created custom page (see createFooterPage) and must already exist
// (in some locale) to be updated.
const FIXED_SLUGS = ["about", "privacy", "terms"] as const;
export type SitePageSlug = (typeof FIXED_SLUGS)[number];

type OkOrError = { error: string } | { ok: true };

// locale is always the locale the admin was viewing when they hit "save" —
// editing the English about page only ever touches the (slug, "en") row,
// never the Swedish one, even if the English row doesn't exist yet and the
// visitor was seeing the Swedish fallback a moment ago.
export async function updateSitePage(slug: string, locale: Locale, title: string, body: string): Promise<OkOrError> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  await requireSiteAdmin(session.user.id);

  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { error: "Titel krävs." };
  const sanitizedBody = sanitizeHtml(body);

  if ((FIXED_SLUGS as readonly string[]).includes(slug)) {
    await prisma.sitePage.upsert({
      where: { slug_locale: { slug, locale } },
      update: { title: trimmedTitle, body: sanitizedBody, updatedById: session.user.id },
      create: { slug, locale, title: trimmedTitle, body: sanitizedBody, updatedById: session.user.id },
    });
  } else {
    // A custom page created under one locale can still be "edited" from
    // another locale — that creates its own translated row rather than
    // requiring the row to already exist for this exact locale.
    const existsAnyLocale = await prisma.sitePage.findFirst({ where: { slug } });
    if (!existsAnyLocale) return { error: "Sidan finns inte." };
    await prisma.sitePage.upsert({
      where: { slug_locale: { slug, locale } },
      update: { title: trimmedTitle, body: sanitizedBody, updatedById: session.user.id },
      create: { slug, locale, title: trimmedTitle, body: sanitizedBody, order: existsAnyLocale.order, updatedById: session.user.id },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createFooterPage(title: string, locale: Locale): Promise<{ error: string } | { ok: true; slug: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  await requireSiteAdmin(session.user.id);

  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { error: "Titel krävs." };

  const baseSlug = slugify(trimmedTitle) || "sida";
  let slug = (FIXED_SLUGS as readonly string[]).includes(baseSlug) ? `${baseSlug}-sida` : baseSlug;
  for (let i = 1; i <= 9; i++) {
    const exists = await prisma.sitePage.findFirst({ where: { slug } });
    if (!exists) break;
    slug = `${baseSlug}-${i}`;
  }

  const maxOrder = await prisma.sitePage.aggregate({ _max: { order: true } });
  const page = await prisma.sitePage.create({
    data: { slug, locale, title: trimmedTitle, body: "", order: (maxOrder._max.order ?? 0) + 1, updatedById: session.user.id },
  });

  revalidatePath("/", "layout");
  return { ok: true, slug: page.slug };
}

export async function deleteFooterPage(slug: string): Promise<OkOrError> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  await requireSiteAdmin(session.user.id);

  if ((FIXED_SLUGS as readonly string[]).includes(slug)) return { error: "Den sidan kan inte tas bort." };

  // Deletes every locale's version of this custom page, not just one.
  await prisma.sitePage.deleteMany({ where: { slug } }).catch(() => null);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function reorderFooterPages(orderedSlugs: string[], locale: Locale): Promise<OkOrError> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const admin = await requireSiteAdmin(session.user.id);

  await prisma.$transaction(
    orderedSlugs.map((slug, i) =>
      prisma.sitePage.upsert({
        where: { slug_locale: { slug, locale } },
        update: { order: i },
        create: {
          slug,
          locale,
          title: DEFAULT_SITE_PAGES[slug as SitePageSlug]?.[locale]?.title ?? slug,
          body: DEFAULT_SITE_PAGES[slug as SitePageSlug]?.[locale]?.body ?? "",
          order: i,
          updatedById: admin.id,
        },
      })
    )
  );

  revalidatePath("/", "layout");
  return { ok: true };
}
