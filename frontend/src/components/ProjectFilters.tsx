"use client";

import { useState } from "react";
import SortToggle from "./SortToggle";

const STAGES = [
  { value: "concept",    label: "Concept" },
  { value: "prototype",  label: "Prototype" },
  { value: "production", label: "In Production" },
  { value: "delivery",   label: "Delivered" },
];

const CATEGORIES = [
  "Technology", "Environment", "Education", "Arts", "Community", "Health", "Other",
];

const SDG_LABELS: Record<number, string> = {
  1:"No Poverty",2:"Zero Hunger",3:"Good Health",4:"Quality Education",
  5:"Gender Equality",6:"Clean Water",7:"Clean Energy",8:"Decent Work",
  9:"Industry & Innovation",10:"Reduced Inequalities",11:"Sustainable Cities",
  12:"Responsible Consumption",13:"Climate Action",14:"Life Below Water",
  15:"Life on Land",16:"Peace & Justice",17:"Partnerships",
};

interface Props {
  sort: string;
  q?: string;
  status?: string;
  category?: string;
  sdg?: string;
  basePath?: string;
  /** Called with the built URL instead of navigating directly, so this component has no router/Link dependency. */
  onNavigate: (url: string) => void;
}

export default function ProjectFilters({ sort, q, status, category, sdg, basePath, onNavigate }: Props) {
  const [query, setQuery] = useState(q ?? "");

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = { sort, q, status, category, sdg };
    const merged = { ...current, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return `${basePath ?? "/projects"}${qs ? `?${qs}` : ""}`;
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    onNavigate(buildUrl({ q: query.trim() || undefined, page: undefined }));
  }

  const clearFiltersHref = buildUrl({ status: undefined, category: undefined, sdg: undefined, page: undefined });

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Sort */}
      <SortToggle sort={sort} q={q} status={status} category={category} sdg={sdg} basePath={basePath} onNavigate={onNavigate} />

      {/* Stage */}
      <select
        value={status ?? ""}
        onChange={(e) => onNavigate(buildUrl({ status: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">All stages</option>
        {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      {/* Category */}
      <select
        value={category ?? ""}
        onChange={(e) => onNavigate(buildUrl({ category: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* SDG */}
      <select
        value={sdg ?? ""}
        onChange={(e) => onNavigate(buildUrl({ sdg: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">All SDG goals</option>
        {Array.from({ length: 17 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>SDG {n} — {SDG_LABELS[n]}</option>
        ))}
      </select>

      {/* Search */}
      <form onSubmit={submitSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects…"
          className="w-48 text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate placeholder-dark-slate/40 focus:outline-none focus:ring-2 focus:ring-coral"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-coral text-white text-xs font-medium rounded-lg hover:bg-watermelon transition-colors"
        >
          Search
        </button>
      </form>

      {(status || category || sdg) && (
        <a
          href={clearFiltersHref}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(clearFiltersHref);
          }}
          className="text-xs text-dark-slate/50 hover:text-dark-slate underline"
        >
          Clear filters
        </a>
      )}
    </div>
  );
}
