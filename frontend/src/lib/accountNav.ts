export interface AccountNavItem {
  href: string;
  labelKey: "profile" | "workplace" | "dashboard" | "settings";
}

export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = [
  { href: "/profile", labelKey: "profile" },
  { href: "/workplace", labelKey: "workplace" },
  { href: "/dashboard", labelKey: "dashboard" },
  { href: "/settings", labelKey: "settings" },
];
