import type { Metadata } from "next";

export const APP_URL = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";

const DEFAULT_DESCRIPTION = "GoodTribes.org — a place for people building a better world.";

export function buildMetadata({
  locale,
  path,
  title,
  description,
  imageUrl,
}: {
  locale: string;
  /** e.g. `/projects/${slug}` — no locale prefix, this helper adds it. */
  path: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
}): Metadata {
  // Resolved against metadataBase (set in app/[locale]/layout.tsx) into an
  // absolute, locale-prefixed URL — next-intl's routing always uses a
  // locale prefix, so the OG url must include it too.
  const url = `/${locale}${path}`;
  const desc = description?.trim() || DEFAULT_DESCRIPTION;
  const ogTitle = `${title} — GoodTribes.org`;

  return {
    title,
    description: desc,
    openGraph: {
      title: ogTitle,
      description: desc,
      url,
      locale,
      ...(imageUrl ? { images: [{ url: imageUrl, alt: title }] } : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: ogTitle,
      description: desc,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}
