import { getTranslations } from "next-intl/server";

// Shown instantly while a phase overview renders (loading.tsx in each
// overview route) — these pages run many queries, and right after a gate's
// "Gå vidare" the next phase's page can take a moment.
export default async function OverviewSkeleton() {
  const t = await getTranslations("OverviewSkeleton");
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 py-6" aria-busy="true" aria-live="polite">
      <div>
        <div className="h-7 w-48 animate-pulse rounded bg-dry-sage/50" />
        <p className="mt-2 text-sm text-dark-slate/50">{t("loading")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-6 w-32 animate-pulse rounded-full bg-dry-sage/40" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-muted-teal/30 bg-white p-5">
          <div className="h-5 w-56 animate-pulse rounded bg-dry-sage/50" />
          <div className="mt-4 flex flex-col gap-2">
            <div className="h-3 w-3/4 animate-pulse rounded bg-dry-sage/40" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-dry-sage/40" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-dry-sage/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
