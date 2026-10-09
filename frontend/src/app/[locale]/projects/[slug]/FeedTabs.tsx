"use client";

import { useState } from "react";

// The project feed with people first (#275): "Nyheter" shows posts, comments
// and who joined, with task events folded into one line; "Allt" is the full
// feed as before. Both are rendered on the server and only toggled here.
export default function FeedTabs({ news, all, labels }: { news: React.ReactNode; all: React.ReactNode; labels: { news: string; all: string } }) {
  const [tab, setTab] = useState<"news" | "all">("news");
  return (
    <div>
      <div className="mb-3 flex gap-1.5" role="tablist">
        {(["news", "all"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${tab === k ? "bg-dark-slate text-white" : "border border-muted-teal/40 text-dark-slate/70 hover:text-dark-slate"}`}
          >
            {labels[k]}
          </button>
        ))}
      </div>
      <div hidden={tab !== "news"}>{news}</div>
      <div hidden={tab !== "all"}>{all}</div>
    </div>
  );
}
