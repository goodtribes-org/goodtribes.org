"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";

interface Props {
  q?: string;
  category?: string;
  skill?: string;
  skills: { slug: string; name: string }[];
  basePath?: string;
  /** Called with the built URL instead of navigating directly, so this component has no router/Link dependency. */
  onNavigate: (url: string) => void;
}

export default function OrgFilters({ q, category, skill, skills, basePath, onNavigate }: Props) {
  const [query, setQuery] = useState(q ?? "");

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = { q, category, skill };
    const merged = { ...current, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return `${basePath ?? "/org"}${qs ? `?${qs}` : ""}`;
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    onNavigate(buildUrl({ q: query.trim() || undefined, page: undefined }));
  }

  const clearFiltersHref = buildUrl({ category: undefined, skill: undefined, page: undefined });

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Category */}
      <select
        value={category ?? ""}
        onChange={(e) => onNavigate(buildUrl({ category: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Skill */}
      <select
        value={skill ?? ""}
        onChange={(e) => onNavigate(buildUrl({ skill: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">All skills sought</option>
        {skills.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
      </select>

      {/* Search */}
      <form onSubmit={submitSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search organisations…"
          className="w-48 text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate placeholder-dark-slate/40 focus:outline-none focus:ring-2 focus:ring-coral"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-coral text-white text-xs font-medium rounded-lg hover:bg-watermelon transition-colors"
        >
          Search
        </button>
      </form>

      {(category || skill) && (
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
