export interface AccountNavItem {
  href: string;
  labelKey: "profile" | "myGoodTribes" | "findProject" | "settings";
}

export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = [
  { href: "/profile", labelKey: "profile" },
  // Mitt GoodTribes replaced Arbetsrum (/workplace redirects there);
  // Dashboard's matching is "Hitta ett projekt".
  { href: "/my-goodtribes", labelKey: "myGoodTribes" },
  { href: "/dashboard", labelKey: "findProject" },
  { href: "/settings", labelKey: "settings" },
];
