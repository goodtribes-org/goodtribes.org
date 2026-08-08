import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { proposeProfitDistribution, executeProfitDistribution, vetoProfitDistribution } from "./actions";

export default async function ProfitDistributionAdminPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SiteAdminProfitDistribution" });

  const pendingRequests = await prisma.profitDistributionProposal.findMany({
    where: { status: "approved_by_members" },
    orderBy: { createdAt: "asc" },
    include: { project: { select: { title: true, slug: true } } },
  });

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
        <p className="text-sm text-dark-slate/60 mt-1">{t("description")}</p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          {t("pendingHeading", { count: pendingRequests.length })}
        </h2>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-dark-slate/40">{t("noPending")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingRequests.map((r) => (
              <div key={r.id} className="border border-muted-teal/40 rounded-lg p-5 bg-white">
                <p className="font-semibold text-dark-slate">{r.project.title}</p>
                <p className="text-sm text-dark-slate/60 mb-3">
                  {t("proposalSummary", {
                    amount: r.auditedProfitSek.toLocaleString(locale === "sv" ? "sv-SE" : "en-US"),
                    operationsPct: r.proposedOperationsPct,
                    impactFundPct: r.proposedImpactFundPct,
                    contributorsPct: 100 - r.proposedOperationsPct - r.proposedImpactFundPct,
                  })}
                </p>

                <form
                  action={async () => {
                    "use server";
                    await executeProfitDistribution(r.id);
                  }}
                  className="flex flex-wrap items-end gap-2 mb-2"
                >
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-coral text-white text-xs font-medium hover:bg-watermelon transition-colors"
                  >
                    {t("executeButton")}
                  </button>
                </form>

                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await vetoProfitDistribution(r.id, (formData.get("note") as string) ?? "");
                  }}
                  className="flex flex-wrap items-end gap-2"
                >
                  <input
                    name="note"
                    type="text"
                    placeholder={t("vetoPlaceholder")}
                    className="flex-1 min-w-40 border border-muted-teal rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                  >
                    {t("vetoButton")}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          {t("newProposalHeading")}
        </h2>
        <p className="text-xs text-dark-slate/50 mb-3">{t("newProposalHint")}</p>
        <form action={proposeProfitDistribution} className="flex flex-wrap gap-2">
          <input
            name="projectSlug"
            type="text"
            placeholder={t("projectSlugPlaceholder")}
            className="border border-muted-teal rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <input
            name="auditedProfitSek"
            type="number"
            min="0"
            placeholder={t("auditedProfitPlaceholder")}
            className="border border-muted-teal rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <input
            name="operationsPct"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder={t("operationsPctPlaceholder")}
            className="border border-muted-teal rounded px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <input
            name="impactFundPct"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder={t("impactFundPctPlaceholder")}
            className="border border-muted-teal rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded border border-muted-teal/50 text-xs font-medium text-dark-slate/70 hover:border-dark-slate/40 hover:text-dark-slate transition-colors"
          >
            {t("createProposalButton")}
          </button>
        </form>
      </section>
    </div>
  );
}
