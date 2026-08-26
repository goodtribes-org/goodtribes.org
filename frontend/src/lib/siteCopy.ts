import { prisma } from "@/lib/prisma";

// One query per page load returns every override for that locale as a flat
// {key: value} map — components then do `copy[key] ?? t(shortKey)`
// (missing key = fall back to the shipped translation), same fallback
// idiom as SitePage/defaultSitePages.ts. `key` is always the exact
// next-intl message path (e.g. "HomePage.tools.leanCanvasLabel"), see the
// SiteCopy model's comment in schema.prisma.
export async function getSiteCopyMap(locale: string): Promise<Record<string, string>> {
  const rows = await prisma.siteCopy.findMany({
    where: { locale },
    select: { key: true, value: true },
  });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
