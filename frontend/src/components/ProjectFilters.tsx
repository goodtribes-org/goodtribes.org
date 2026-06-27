"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

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
  status?: string;
  category?: string;
  sdg?: string;
  total: number;
}

export default function ProjectFilters({ sort, status, category, sdg, total }: Props) {
  const router = useRouter();

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = { sort, status, category, sdg };
    const merged = { ...current, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return `/projects${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Sort */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { value: "new",      label: "New" },
          { value: "top",      label: "Top" },
          { value: "trending", label: "Trending" },
        ].map((s) => (
          <Link
            key={s.value}
            href={buildUrl({ sort: s.value, page: undefined })}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              sort === s.value
                ? "bg-white text-dark-slate shadow-sm"
                : "text-dark-slate/60 hover:text-dark-slate"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Stage */}
      <select
        value={status ?? ""}
        onChange={(e) => router.push(buildUrl({ status: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">All stages</option>
        {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      {/* Category */}
      <select
        value={category ?? ""}
        onChange={(e) => router.push(buildUrl({ category: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* SDG */}
      <select
        value={sdg ?? ""}
        onChange={(e) => router.push(buildUrl({ sdg: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">All SDG goals</option>
        {Array.from({ length: 17 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>SDG {n} — {SDG_LABELS[n]}</option>
        ))}
      </select>

      {(status || category || sdg) && (
        <Link
          href={buildUrl({ status: undefined, category: undefined, sdg: undefined, page: undefined })}
          className="text-xs text-dark-slate/50 hover:text-dark-slate underline"
        >
          Clear filters
        </Link>
      )}

      <span className="ml-auto text-xs text-dark-slate/40">{total} project{total !== 1 ? "s" : ""}</span>
    </div>
  );
}
