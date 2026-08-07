import { getTranslations } from "next-intl/server";

export default async function ImpactStatsWidget({
  totalRaised,
  totalTokens,
  completedTasks,
}: {
  totalRaised: number;
  totalTokens: number;
  completedTasks: number;
}) {
  const t = await getTranslations("ImpactStatsWidget");
  const formattedRaised = new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(totalRaised);

  return (
    <section className="border border-muted-teal/30 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-dark-slate mb-3">{t("heading")}</h2>

      <div className="bg-coral/10 rounded-xl px-4 py-3 text-center mb-2">
        <p className="text-3xl font-bold text-coral">{formattedRaised}</p>
        <p className="text-dark-slate/60 text-sm mt-0.5">{t("totalRaised")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-dry-sage/20 rounded-xl px-3 py-2 text-center">
          <p className="text-xl font-bold text-dark-slate">{totalTokens.toLocaleString("sv-SE")}</p>
          <p className="text-dark-slate/60 text-xs mt-0.5">{t("tokensAwarded")}</p>
        </div>
        <div className="bg-dry-sage/20 rounded-xl px-3 py-2 text-center">
          <p className="text-xl font-bold text-dark-slate">{completedTasks.toLocaleString("sv-SE")}</p>
          <p className="text-dark-slate/60 text-xs mt-0.5">{t("tasksCompleted")}</p>
        </div>
      </div>
    </section>
  );
}
