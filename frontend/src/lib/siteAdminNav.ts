// Shared between the site-admin layout's own tab bar and the global side menu,
// so the two can't drift apart. Labels are hardcoded Swedish, same as the
// site-admin area itself (admin-only tooling, not run through next-intl).
export const SITE_ADMIN_NAV = [
  { href: "/site-admin/ethics", label: "Etikgranskning" },
  { href: "/site-admin/content-flags", label: "Innehållsflaggor" },
  { href: "/site-admin/suggestions", label: "Förbättringsförslag" },
  { href: "/site-admin/users", label: "Användare" },
  { href: "/site-admin/projects", label: "Projekt" },
  { href: "/site-admin/organisations", label: "Organisationer" },
  { href: "/site-admin/token-backfill", label: "Token-bakfyllning" },
  { href: "/site-admin/council", label: "Granskningsråd" },
  { href: "/site-admin/sandbox-graduation", label: "Drömfabriken-ansökningar" },
  { href: "/site-admin/impact-reports", label: "Impact-rapporter" },
  { href: "/site-admin/legal-type", label: "Juridisk form" },
  { href: "/site-admin/profit-distribution", label: "Vinstfördelning" },
  { href: "/site-admin/impact-fund", label: "Impact-fond" },
  { href: "/site-admin/hero-carousel", label: "Startsidan" },
  { href: "/site-admin/sandbox-hero", label: "Drömfabriken" },
  { href: "/site-admin/site-copy", label: "Sidtexter" },
  { href: "/site-admin/shop", label: "Shop" },
  { href: "/site-admin/funding-sources", label: "Fondkatalog" },
];
