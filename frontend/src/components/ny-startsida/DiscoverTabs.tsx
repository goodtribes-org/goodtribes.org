"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";

// Ideas, funding calls and challenges answer the same question — what can I
// take on? — so the start page shows them as one module with tabs instead of
// three card rows in a row. The cards are rendered on the server and passed
// in; only the tab switching happens here.

export type DiscoverTab = {
  key: string;
  label: string;
  heading: string;
  allLink: { href: string; label: string };
  content: React.ReactNode;
};

const LINK = "#C2410C";
const MUTED = "#4A514D";

export default function DiscoverTabs({ tabs, tabsLabel }: { tabs: DiscoverTab[]; tabsLabel: string }) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  const active = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];
  if (!active) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label={tabsLabel} className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const selected = tab.key === active.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={`discover-tab-${tab.key}`}
                aria-selected={selected}
                aria-controls={`discover-panel-${tab.key}`}
                onClick={() => setActiveKey(tab.key)}
                className={`rounded-full border px-4 py-2 text-[15px] font-semibold transition-colors ${
                  selected
                    ? "border-[#1B1F1D] bg-[#1B1F1D] text-white"
                    : "border-[#E4E4DF] bg-white text-[#1B1F1D] hover:border-[#C2410C]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <Link href={active.allLink.href} className="shrink-0 text-[17px] font-semibold no-underline hover:text-[#9A3412]" style={{ color: LINK }}>
          {active.allLink.label}
        </Link>
      </div>
      <div role="tabpanel" id={`discover-panel-${active.key}`} aria-labelledby={`discover-tab-${active.key}`} className="flex flex-col gap-4">
        <p className="m-0 text-lg" style={{ color: MUTED }}>{active.heading}</p>
        {active.content}
      </div>
    </div>
  );
}
