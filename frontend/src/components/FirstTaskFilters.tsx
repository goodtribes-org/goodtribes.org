"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { FirstTaskFilters as Filters } from "@/lib/firstTasks";

// Filters for the list of first tasks (#279), as dropdowns in one row like
// the project list's (ProjectFilters): global goal, form, phase, time, place,
// and a search box. Each change navigates, so a filtered list is a link.

const SELECT = "text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral";
const KEYS = ["q", "sdg", "form", "phase", "time", "place"] as const;
const PHASES = ["IDEA", "PILOT", "PRODUCTION", "ESTABLISH", "SCALE", "IMPACT"] as const;

export default function FirstTaskFilters({ filters, sdgs, sdgLabels }: { filters: Filters; sdgs: number[]; sdgLabels: Record<number, string> }) {
  const t = useTranslations("FirstTasksDiscover");
  const tPhase = useTranslations("ProjectPhase");
  const router = useRouter();
  const [query, setQuery] = useState(filters.q ?? "");

  function go(change: Partial<Record<(typeof KEYS)[number], string | null>>) {
    const params = new URLSearchParams();
    for (const k of KEYS) {
      const v = k in change ? change[k] : filters[k];
      if (v !== null && v !== undefined && v !== "") params.set(k, String(v));
    }
    const qs = params.toString();
    router.push(qs ? `/micro-tasks?${qs}` : "/micro-tasks", { scroll: false });
  }
  const select = (key: (typeof KEYS)[number]) => ({
    value: filters[key] === null ? "" : String(filters[key]),
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => go({ [key]: e.target.value || null }),
    className: SELECT,
  });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select {...select("sdg")} aria-label={t("filterSdg")}>
        <option value="">{t("allSdgs")}</option>
        {sdgs.map((g) => <option key={g} value={g}>SDG {g} — {sdgLabels[g]}</option>)}
      </select>
      <select {...select("form")} aria-label={t("filterForm")}>
        <option value="">{t("allForms")}</option>
        <option value="nonprofit">{t("nonprofit")}</option>
        <option value="commercial">{t("commercial")}</option>
      </select>
      <select {...select("phase")} aria-label={t("filterPhase")}>
        <option value="">{t("allPhases")}</option>
        {PHASES.map((p) => <option key={p} value={p}>{tPhase(p)}</option>)}
      </select>
      <select {...select("time")} aria-label={t("filterTime")}>
        <option value="">{t("allTimes")}</option>
        <option value="short">{t("timeShort")}</option>
        <option value="recurring">{t("timeRecurring")}</option>
      </select>
      <select {...select("place")} aria-label={t("filterPlace")}>
        <option value="">{t("allPlaces")}</option>
        <option value="remote">{t("placeRemote")}</option>
        <option value="onsite">{t("placeOnsite")}</option>
      </select>
      <form onSubmit={(e) => { e.preventDefault(); go({ q: query.trim() || null }); }} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-56 text-xs border border-muted-teal rounded-lg px-3 py-1.5 bg-white text-dark-slate placeholder-dark-slate/40 focus:outline-none focus:ring-2 focus:ring-coral"
        />
        <button type="submit" className="text-xs font-semibold rounded-lg px-4 py-1.5 bg-coral text-white hover:bg-coral/90">{t("search")}</button>
      </form>
    </div>
  );
}
