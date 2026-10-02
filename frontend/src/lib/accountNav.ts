export interface AccountNavItem {
  href: string;
  labelKey: "profile" | "myGoodTribes" | "findProject" | "settings";
}

export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = [
  { href: "/profile", labelKey: "profile" },
  // Mitt GoodTribes replaced Arbetsrum and Dashboard (both redirect there);
  // "Hitta ett projekt" is its matching tab.
  { href: "/my-goodtribes", labelKey: "myGoodTribes" },
  { href: "/my-goodtribes?tab=find", labelKey: "findProject" },
  { href: "/settings", labelKey: "settings" },
];
