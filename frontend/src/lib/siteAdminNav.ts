// The site-admin menu, grouped by what an admin is doing rather than one long
// row of tabs. Shared by the site-admin layout and the overview page, so the
// two can't drift apart. Labels are hardcoded Swedish, same as the
// site-admin area itself (admin-only tooling, not run through next-intl).
// `count` names a queue in getAdminQueueCounts (lib/siteAdminCounts.ts):
// the item shows how many are waiting.

export type AdminQueue = "contentFlags" | "ethics" | "suggestions" | "impactReports" | "invoicing" | "legalType" | "profitDistribution";

// `short`: the menu's label where the full one doesn't fit its width.
export type AdminNavItem = { href: string; label: string; short?: string; count?: AdminQueue };
export type AdminNavGroup = { title: string; items: AdminNavItem[] };

export const SITE_ADMIN_GROUPS: AdminNavGroup[] = [
  {
    title: "Granska",
    items: [
      { href: "/site-admin/content-flags", label: "Innehållsflaggor", count: "contentFlags" },
      { href: "/site-admin/ethics", label: "Etikgranskning", count: "ethics" },
      { href: "/site-admin/impact-reports", label: "Impactrapporter", count: "impactReports" },
      { href: "/site-admin/suggestions", label: "Förbättringsförslag", count: "suggestions" },
    ],
  },
  {
    title: "Människor",
    items: [
      { href: "/site-admin/metrics", label: "Tratt och North Star", short: "Tratten" },
      { href: "/site-admin/users", label: "Användare" },
      { href: "/site-admin/organisations", label: "Organisationer" },
      { href: "/site-admin/council", label: "Granskningsrådet" },
    ],
  },
  {
    title: "Projekt",
    items: [
      { href: "/site-admin/projects", label: "Alla projekt" },
      { href: "/site-admin/invoicing", label: "Ansökningar om fakturering", short: "Fakturering", count: "invoicing" },
      { href: "/site-admin/legal-type", label: "Byte av juridisk form", count: "legalType" },
    ],
  },
  {
    title: "Pengar och beslut",
    items: [
      { href: "/site-admin/profit-distribution", label: "Vinstfördelning", count: "profitDistribution" },
      { href: "/site-admin/impact-fund", label: "Impactfonden" },
      { href: "/site-admin/funding-sources", label: "Fondkatalog" },
      { href: "/site-admin/shop", label: "Shop" },
      { href: "/site-admin/token-backfill", label: "Token-bakfyllning" },
    ],
  },
  {
    title: "Sajtens innehåll",
    items: [
      { href: "/site-admin/hero-carousel", label: "Startsidan" },
      { href: "/site-admin/about-pillars", label: "Rutorna på Om oss" },
      { href: "/site-admin/site-copy", label: "Sidtexter" },
      { href: "/site-admin/events", label: "Event (QR-kväll)", short: "Event" },
      { href: "/site-admin/feature-flags", label: "Funktionsflaggor" },
    ],
  },
];

export const SITE_ADMIN_NAV: AdminNavItem[] = SITE_ADMIN_GROUPS.flatMap((g) => g.items);
