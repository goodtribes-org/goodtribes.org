import { getTranslations } from "next-intl/server";
import { SdgIcon } from "@/components/SdgIcon";
import {
  getVerifiedImpactReports,
  groupReportsByKind,
  safeExternalUrl,
  verifiedSdgGoals,
} from "@/lib/impactReports";

type PanelReport = Awaited<ReturnType<typeof getVerifiedImpactReports>>[number];

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

  const { delivered, supportReceived } = groupReportsByKind(reports);
  // Only delivered results define what this project has verified impact *on* —
  // an SDG tagged on a grant it received says something about the funder.
  const goals = verifiedSdgGoals(delivered);

  // `muted` keeps support-received figures visually subordinate: same
  // structure, but not the same green as a delivered result, so the eye can't
  // mistake money in for impact out even when skimming.
  function ReportRow({ report, muted = false }: { report: PanelReport; muted?: boolean }) {
    const evidence = safeExternalUrl(report.evidenceUrl);
    return (
      <div className="border-t border-muted-teal/20 pt-2.5 first:border-0 first:pt-0">
        <p
          className={`text-lg font-bold leading-none ${muted ? "text-dark-slate/70" : "text-seagrass"}`}
        >
          {report.valueQualifier !== "EXACT" && (
            <span className="text-xs font-normal text-dark-slate/50 mr-1">
              {t(`qualifier.${report.valueQualifier}`)}
            </span>
          )}
          {report.metricValue.toLocaleString(locale)}
          {report.metricUnit && (
            <span className="text-xs font-normal text-dark-slate/40 ml-1">{report.metricUnit}</span>
          )}
        </p>
        <p className="text-xs text-dark-slate/70 mt-0.5 leading-snug">{report.metricDescription}</p>
        <div className="flex flex-wrap items-center gap-x-2 mt-1 text-[11px] text-dark-slate/40">
          {report.sourceName && <span>{report.sourceName}</span>}
          {report.isCumulative && <span>{t("cumulativeNote")}</span>}
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
  }

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

      {delivered.length > 0 && (
        <div className="space-y-3">
          {delivered.map((report) => (
            <ReportRow key={report.id} report={report} />
          ))}
        </div>
      )}

      {/* Support received is shown, but never in the same list as delivered
          impact — these are resources that made the work possible, not results
          the project achieved, and a single column of green numbers would read
          as if they were the same thing. */}
      {supportReceived.length > 0 && (
        <div className="mt-4 pt-3 border-t border-muted-teal/30">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-slate/40 mb-2">
            {t("supportHeading")}
          </p>
          <div className="space-y-3">
            {supportReceived.map((report) => (
              <ReportRow key={report.id} report={report} muted />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
