const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL;
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

export interface StrapiPage {
  title: string;
  body: string;
}

/**
 * Fetches a Strapi single-type's editorial content (About/Privacy/Terms pages).
 * Strapi only owns this kind of static copy — never product data (Project/Organisation/
 * User etc. stay in Prisma). Returns null on any failure (unset env, network error,
 * no published entry yet) so callers can fall back to hardcoded copy — Strapi content
 * must be populated via the admin UI before it takes over from the fallback.
 */
export async function getStrapiPage(apiId: string): Promise<StrapiPage | null> {
  if (!STRAPI_URL) return null;

  try {
    const res = await fetch(`${STRAPI_URL}/api/${apiId}`, {
      headers: STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {},
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { data?: { title?: string; body?: string } | null };
    if (!json.data?.body) return null;

    return { title: json.data.title ?? "", body: json.data.body };
  } catch {
    return null;
  }
}
