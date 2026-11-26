export interface AccountNavItem {
  href: string;
  labelKey: "profile" | "settings";
}

export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = [
  // Just the account (#366). Mitt GoodTribes and "Hitta ett projekt" moved to
  // the header's own ⌂ icon, so nobody has to dig into this menu for them.
  { href: "/profile", labelKey: "profile" },
  { href: "/settings", labelKey: "settings" },
];
