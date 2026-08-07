"use client";

import { useState } from "react";
import SortToggle from "./SortToggle";
import { DISPLAY_PHASES as STAGES } from "@/lib/projectPhase";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";

const SDG_LABELS: Record<number, string> = {
  1: "Ingen fattigdom", 2: "Ingen hunger", 3: "God hälsa", 4: "God utbildning",
  5: "Jämställdhet", 6: "Rent vatten", 7: "Hållbar energi", 8: "Anständiga arbetsvillkor",
  9: "Hållbar industri", 10: "Minskad ojämlikhet", 11: "Hållbara städer",
  12: "Hållbar konsumtion", 13: "Bekämpa klimatförändringarna", 14: "Hav och marina resurser",
  15: "Ekosystem och biologisk mångfald", 16: "Fredliga samhällen", 17: "Globalt partnerskap",
};

interface Props {
  sort: string;
  q?: string;
  phase?: string;
  category?: string;
  sdg?: string;
  basePath?: string;
  /** Called with the built URL instead of navigating directly, so this component has no router/Link dependency. */
  onNavigate: (url: string) => void;
}

export default function ProjectFilters({ sort, q, phase, category, sdg, basePath, onNavigate }: Props) {
  const [query, setQuery] = useState(q ?? "");

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = { sort, q, phase, category, sdg };
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

  const clearFiltersHref = buildUrl({ phase: undefined, category: undefined, sdg: undefined, page: undefined });

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Sort */}
      <SortToggle sort={sort} q={q} phase={phase} category={category} sdg={sdg} basePath={basePath} onNavigate={onNavigate} />

      {/* Stage */}
      <select
        value={phase ?? ""}
        onChange={(e) => onNavigate(buildUrl({ phase: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">Alla faser</option>
        {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      {/* Category */}
      <select
        value={category ?? ""}
        onChange={(e) => onNavigate(buildUrl({ category: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">Alla kategorier</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
      </select>

      {/* SDG */}
      <select
        value={sdg ?? ""}
        onChange={(e) => onNavigate(buildUrl({ sdg: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">Alla globala mål</option>
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
          placeholder="Sök projekt…"
          className="w-48 text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate placeholder-dark-slate/40 focus:outline-none focus:ring-2 focus:ring-coral"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-coral text-white text-xs font-medium rounded-lg hover:bg-watermelon transition-colors"
        >
          Sök
        </button>
      </form>

      {(phase || category || sdg) && (
        <a
          href={clearFiltersHref}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(clearFiltersHref);
          }}
          className="text-xs text-dark-slate/50 hover:text-dark-slate underline"
        >
          Rensa filter
        </a>
      )}
    </div>
  );
}
