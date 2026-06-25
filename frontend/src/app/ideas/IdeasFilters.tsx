"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Technology", "Environment", "Education", "Health",
  "Community", "Policy", "Arts & Culture", "Economy",
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
  category?: string;
  region?: string;
  sdg?: string;
  status?: string;
  total: number;
}

export default function IdeasFilters({ sort, category, region, sdg, status, total }: Props) {
  const router = useRouter();

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = { sort, category, region, sdg, status };
    const merged = { ...current, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return `/ideas${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Sort */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { value: "new", label: "New" },
          { value: "top", label: "Top" },
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

      {/* Category */}
      <select
        value={category ?? ""}
        onChange={(e) => router.push(buildUrl({ category: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Region */}
      <select
        value={region ?? ""}
        onChange={(e) => router.push(buildUrl({ region: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">All regions</option>
        <option value="local">Local</option>
        <option value="regional">Regional</option>
        <option value="national">National</option>
        <option value="global">Global</option>
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

      {(category || region || sdg) && (
        <Link
          href={buildUrl({ category: undefined, region: undefined, sdg: undefined, page: undefined })}
          className="text-xs text-dark-slate/50 hover:text-dark-slate underline"
        >
          Clear filters
        </Link>
      )}

      <span className="ml-auto text-xs text-dark-slate/40">{total} idea{total !== 1 ? "s" : ""}</span>
    </div>
  );
}
