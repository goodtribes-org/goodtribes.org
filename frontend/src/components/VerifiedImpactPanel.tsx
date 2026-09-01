import { getTranslations } from "next-intl/server";
import { SdgIcon } from "@/components/SdgIcon";
import { getVerifiedImpactReports, safeExternalUrl, verifiedSdgGoals } from "@/lib/impactReports";

// The public, funder-facing view of a project's verified impact. Fetches its
// own data rather than being threaded through the project page's already-large
// query, and renders nothing at all when there's nothing verified — an empty
// "verified impact" box would read as a negative claim about the project.
export async function VerifiedImpactPanel({
  projectId,
  locale,
}: {
  projectId: string;
  locale: string;
}) {
  const [reports, t] = await Promise.all([
    getVerifiedImpactReports(projectId),
    getTranslations({ locale, namespace: "VerifiedImpactPanel" }),
  ]);

  if (reports.length === 0) return null;

  const goals = verifiedSdgGoals(reports);

  return (
    <section className="bg-white border border-seagrass/30 rounded-xl p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-seagrass">✓</span>
        <h2 className="text-sm font-semibold text-dark-slate">{t("heading")}</h2>
      </div>
      <p className="text-[11px] text-dark-slate/40 leading-relaxed mb-3">{t("subtitle")}</p>

      {goals.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {goals.map((n) => (
            <SdgIcon key={n} n={n} size={24} />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {reports.map((report) => {
          const evidence = safeExternalUrl(report.evidenceUrl);
          return (
            <div key={report.id} className="border-t border-muted-teal/20 pt-2.5 first:border-0 first:pt-0">
              <p className="text-lg font-bold text-seagrass leading-none">
                {report.metricValue.toLocaleString(locale)}
                {report.metricUnit && (
                  <span className="text-xs font-normal text-dark-slate/40 ml-1">
                    {report.metricUnit}
                  </span>
                )}
              </p>
              <p className="text-xs text-dark-slate/70 mt-0.5 leading-snug">
                {report.metricDescription}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 mt-1 text-[11px] text-dark-slate/40">
                {report.verifiedAt && (
                  <span>{t("verifiedOn", { date: report.verifiedAt.toLocaleDateString(locale) })}</span>
                )}
                {evidence && (
                  <a
                    href={evidence}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-coral hover:underline"
                  >
                    {t("evidenceLink")}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
