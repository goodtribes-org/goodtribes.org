"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// Idea.category is its own set (distinct from @/lib/categories, which backs
// Project/Organisation) — values stay English since they're the actual
// stored/filtered-by value; only the visible label is translated.
const CATEGORIES = [
  "Technology", "Environment", "Education", "Health",
  "Community", "Policy", "Arts & Culture", "Economy",
];

const CATEGORY_KEYS: Record<string, string> = {
  Technology: "categoryTechnology",
  Environment: "categoryEnvironment",
  Education: "categoryEducation",
  Health: "categoryHealth",
  Community: "categoryCommunity",
  Policy: "categoryPolicy",
  "Arts & Culture": "categoryArtsAndCulture",
  Economy: "categoryEconomy",
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
  const t = useTranslations("Filters");
  const tSdg = useTranslations("Sdg");
  const tCategories = useTranslations("Categories");

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
          { value: "new", label: t("sortNew") },
          { value: "top", label: t("sortTop") },
          { value: "trending", label: t("sortTrending") },
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
        <option value="">{t("allCategories")}</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{tCategories(CATEGORY_KEYS[c])}</option>)}
      </select>

      {/* Region */}
      <select
        value={region ?? ""}
        onChange={(e) => router.push(buildUrl({ region: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">{t("allRegions")}</option>
        <option value="local">{t("regionLocal")}</option>
        <option value="regional">{t("regionRegional")}</option>
        <option value="national">{t("regionNational")}</option>
        <option value="global">{t("regionGlobal")}</option>
      </select>

      {/* SDG */}
      <select
        value={sdg ?? ""}
        onChange={(e) => router.push(buildUrl({ sdg: e.target.value || undefined, page: undefined }))}
        className="text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <option value="">{t("allSdgGoals")}</option>
        {Array.from({ length: 17 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>SDG {n} — {tSdg(`sdg${n}`)}</option>
        ))}
      </select>

      {(category || region || sdg) && (
        <Link
          href={buildUrl({ category: undefined, region: undefined, sdg: undefined, page: undefined })}
          className="text-xs text-dark-slate/50 hover:text-dark-slate underline"
        >
          {t("clearFilters")}
        </Link>
      )}

      <span className="ml-auto text-xs text-dark-slate/40">{t("ideaCount", { count: total })}</span>
    </div>
  );
}
