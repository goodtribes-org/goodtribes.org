"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

// Idea.category is its own set (distinct from @/lib/categories, which backs
// Project/Organisation) — values stay English since they're the actual
// stored/filtered-by value; only the visible label is Swedish.
const CATEGORIES = [
  "Technology", "Environment", "Education", "Health",
  "Community", "Policy", "Arts & Culture", "Economy",
];

const CATEGORY_LABELS: Record<string, string> = {
  Technology: "Teknik",
  Environment: "Miljö",
  Education: "Utbildning",
  Health: "Hälsa",
  Community: "Community",
  Policy: "Policy",
  "Arts & Culture": "Kultur",
  Economy: "Ekonomi",
};

const SDG_LABELS: Record<number, string> = {
  1: "Ingen fattigdom", 2: "Ingen hunger", 3: "God hälsa", 4: "God utbildning",
  5: "Jämställdhet", 6: "Rent vatten", 7: "Hållbar energi", 8: "Anständiga arbetsvillkor",
  9: "Hållbar industri", 10: "Minskad ojämlikhet", 11: "Hållbara städer",
  12: "Hållbar konsumtion", 13: "Bekämpa klimatförändringarna", 14: "Hav och marina resurser",
  15: "Ekosystem och biologisk mångfald", 16: "Fredliga samhällen", 17: "Globalt partnerskap",
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
          { value: "new", label: "Nya" },
          { value: "top", label: "Topp" },
          { value: "trending", label: "Trendar" },
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
        <option value="">Alla kategorier</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
      </select>

      {/* Region */}
      <select
        value={region ?? ""}
        onChange={(e) => router.push(buildUrl({ region: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">Alla regioner</option>
        <option value="local">Lokal</option>
        <option value="regional">Regional</option>
        <option value="national">Nationell</option>
        <option value="global">Global</option>
      </select>

      {/* SDG */}
      <select
        value={sdg ?? ""}
        onChange={(e) => router.push(buildUrl({ sdg: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">Alla globala mål</option>
        {Array.from({ length: 17 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>SDG {n} — {SDG_LABELS[n]}</option>
        ))}
      </select>

      {(category || region || sdg) && (
        <Link
          href={buildUrl({ category: undefined, region: undefined, sdg: undefined, page: undefined })}
          className="text-xs text-dark-slate/50 hover:text-dark-slate underline"
        >
          Rensa filter
        </Link>
      )}

      <span className="ml-auto text-xs text-dark-slate/40">{total} {total === 1 ? "idé" : "idéer"}</span>
    </div>
  );
}
