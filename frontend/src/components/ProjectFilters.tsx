"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import SortToggle from "./SortToggle";
import { DISPLAY_PHASES as STAGES } from "@/lib/projectPhase";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/categories";

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
  const t = useTranslations("Filters");
  const tSdg = useTranslations("Sdg");
  const tCategories = useTranslations("Categories");
  const tPhase = useTranslations("ProjectPhase");
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
        <option value="">{t("allStages")}</option>
        {STAGES.map((s) => <option key={s.value} value={s.value}>{tPhase(s.value)}</option>)}
      </select>

      {/* Category */}
      <select
        value={category ?? ""}
        onChange={(e) => onNavigate(buildUrl({ category: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">{t("allCategories")}</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{tCategories(CATEGORY_KEYS[c])}</option>)}
      </select>

      {/* SDG */}
      <select
        value={sdg ?? ""}
        onChange={(e) => onNavigate(buildUrl({ sdg: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">{t("allSdgGoals")}</option>
        {Array.from({ length: 17 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>SDG {n} — {tSdg(`sdg${n}`)}</option>
        ))}
      </select>

      {/* Search */}
      <form onSubmit={submitSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchProjectsPlaceholder")}
          className="w-48 text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate placeholder-dark-slate/40 focus:outline-none focus:ring-2 focus:ring-coral"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-coral text-white text-xs font-medium rounded-lg hover:bg-watermelon transition-colors"
        >
          {t("search")}
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
          {t("clearFilters")}
        </a>
      )}
    </div>
  );
}
