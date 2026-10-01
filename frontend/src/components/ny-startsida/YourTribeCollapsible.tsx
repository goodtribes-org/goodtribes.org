"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { YOUR_TRIBE_COLLAPSED_COOKIE } from "@/lib/yourTribeCookie";

// "Visa mindre" folds "Din tribe" down to one summary line. The choice is a
// cookie (lib/yourTribeCookie.ts) rather than localStorage, so the server
// already renders the right state and the page doesn't flash.

export default function YourTribeCollapsible({
  initialCollapsed, summary, children,
}: {
  initialCollapsed: boolean; summary: React.ReactNode; children: React.ReactNode;
}) {
  const t = useTranslations("YourTribe");
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${YOUR_TRIBE_COLLAPSED_COOKIE}=${next ? "1" : "0"}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {collapsed && <div className="min-w-0 flex-1 text-sm text-[#4A514D]">{summary}</div>}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className="ml-auto shrink-0 rounded-full border border-[#E4E4DF] bg-white px-3 py-1 text-xs font-semibold text-[#4A514D] hover:border-[#C2410C]"
        >
          {collapsed ? t("showMore") : t("showLess")}
        </button>
      </div>
      {!collapsed && children}
    </div>
  );
}
