import { getBackfillCandidates } from "./actions";
import BackfillPanel from "./BackfillPanel";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";

export default async function TokenBackfillPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SiteAdminTokenBackfillPage" });

  const { candidates, cappedAt } = await getBackfillCandidates();
  const payable = candidates.filter((c) => c.payees.length > 0);
  const unpayable = candidates.filter((c) => c.payees.length === 0);
  const totalTokens = payable.reduce((sum, c) => sum + c.tokenValue, 0);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          {t.rich("description", {
            code: (chunks) => <code>{chunks}</code>,
          })}
        </p>
      </div>

      {cappedAt && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          {t("cappedNotice", { count: cappedAt })}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border border-muted-teal/30 rounded-xl p-4">
          <p className="text-xs text-dark-slate/50">{t("payableCountLabel")}</p>
          <p className="text-2xl font-bold text-dark-slate">{payable.length}</p>
        </div>
        <div className="border border-muted-teal/30 rounded-xl p-4">
          <p className="text-xs text-dark-slate/50">{t("tokensToDistributeLabel")}</p>
          <p className="text-2xl font-bold text-coral">{Math.round(totalTokens)}</p>
        </div>
        <div className="border border-muted-teal/30 rounded-xl p-4">
          <p className="text-xs text-dark-slate/50">{t("skippedNoPayeeLabel")}</p>
          <p className="text-2xl font-bold text-dark-slate/40">{unpayable.length}</p>
        </div>
      </div>

      <BackfillPanel disabled={payable.length === 0} />

      <div className="mt-8 border border-muted-teal/30 rounded-xl divide-y divide-muted-teal/15">
        {candidates.length === 0 && (
          <p className="text-sm text-dark-slate/40 italic p-4">{t("emptyState")}</p>
        )}
        {candidates.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark-slate truncate">{c.title}</p>
              <p className="text-xs text-dark-slate/40">
                {c.project.title} · {c.priority} ·{" "}
                {c.payees.length === 0
                  ? t("noPayee")
                  : c.payees
                      .map((p) => {
                        const name = p.userId === c.assignee?.id ? c.assignee?.name : null;
                        return `${name ?? p.userId} (${Math.round(p.tokens)})`;
                      })
                      .join(", ")}
              </p>
            </div>
            <span className={`text-xs font-semibold ${c.payees.length > 0 ? "text-coral" : "text-dark-slate/30 line-through"}`}>
              {t("tokensCount", { count: Math.round(c.tokenValue) })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
