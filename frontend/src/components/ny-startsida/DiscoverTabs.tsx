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
  allLink: { href: string; label: string };
  content: React.ReactNode;
};

const LINK = "#C2410C";

// The module's header is drawn here too, because its "see all" link follows
// the active tab and sits on the eyebrow's row like every other module's.
export default function DiscoverTabs({ tabs, tabsLabel, eyebrow, heading }: { tabs: DiscoverTab[]; tabsLabel: string; eyebrow: string; heading: React.ReactNode }) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  const active = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];
  if (!active) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="m-0 text-xs font-bold uppercase tracking-[.12em]" style={{ color: LINK }}>{eyebrow}</p>
          <Link href={active.allLink.href} className="shrink-0 text-[17px] font-semibold no-underline hover:text-[#9A3412]" style={{ color: LINK }}>
            {active.allLink.label}
          </Link>
        </div>
        {heading}
      </div>
      <div className="flex flex-col gap-5">
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
        <div role="tabpanel" id={`discover-panel-${active.key}`} aria-labelledby={`discover-tab-${active.key}`} className="flex flex-col gap-4">
          {active.content}
        </div>
      </div>
    </div>
  );
}
