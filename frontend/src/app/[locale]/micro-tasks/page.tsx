export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { buildMetadata } from "@/lib/metadata";
import Pagination from "@/components/Pagination";
import FirstTaskCard from "@/components/FirstTaskCard";
import { firstTaskSdgs, parseFirstTaskFilters, searchFirstTasks } from "@/lib/firstTasks";
import { SDG_LABELS_EN, SDG_LABELS_SV } from "@/lib/sdg";
import FirstTaskFilters from "@/components/FirstTaskFilters";

// Första uppgifter (#279): every open first task across published projects,
// with search and filters (global goal, nonprofit/commercial, phase, time,
// place) as dropdowns like the project list. Filters live in the URL, so a
// filtered list can be shared. Keeps the old /micro-tasks address, which this page replaces.

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FirstTasksDiscover" });
  return buildMetadata({ locale, path: "/micro-tasks", title: t("pageTitle"), description: t("pageDescription") });
}

const PAGE_SIZE = 12;
const KEYS = ["q", "sdg", "form", "phase", "time", "place"] as const;




export default async function FirstTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "FirstTasksDiscover" });
  const f = parseFirstTaskFilters(sp);
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1") || 1);
  const [{ total, items }, sdgs] = await Promise.all([
    searchFirstTasks(f, { take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    firstTaskSdgs(),
  ]);
  const anyFilter = KEYS.some((k) => f[k] !== null);
  const sdgLabels = locale === "sv" ? SDG_LABELS_SV : SDG_LABELS_EN;
  const rawParams = Object.fromEntries(KEYS.map((k) => [k, f[k] === null ? undefined : String(f[k])]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[.12em] text-[#C2410C]">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1B1F1D] sm:text-4xl">{t("heading")}</h1>
        <p className="mt-2 max-w-2xl text-base text-[#4A514D]">{t("intro")}</p>
      </div>

      <FirstTaskFilters filters={f} sdgs={sdgs} sdgLabels={sdgLabels} />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#4A514D]">{t("count", { count: total })}</p>
        {anyFilter && <Link href="/micro-tasks" className="text-sm font-semibold text-[#C2410C] hover:underline">{t("clear")}</Link>}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#E4E4DF] p-10 text-center text-[#6B726E]">
          {anyFilter ? t("empty") : t("emptyNone")}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((task) => <FirstTaskCard key={task.id} task={task} />)}
        </div>
      )}

      <Pagination page={page} total={total} perPage={PAGE_SIZE} searchParams={rawParams} basePath="/micro-tasks" />
    </div>
  );
}
