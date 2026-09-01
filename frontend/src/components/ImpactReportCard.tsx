import { getTranslations } from "next-intl/server";
import { SdgIcon } from "@/components/SdgIcon";
import {
  impactReportStatus,
  safeExternalUrl,
  type ImpactReportKind,
  type ImpactValueQualifier,
} from "@/lib/impactReports";

export interface ImpactReportCardData {
  id: string;
  sdgGoals: number[];
  metricDescription: string;
  metricValue: number;
  metricUnit: string | null;
  kind: ImpactReportKind;
  valueQualifier: ImpactValueQualifier;
  isCumulative: boolean;
  sourceName: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  evidenceUrl: string | null;
  verifiedAt: Date | null;
  rejectedAt: Date | null;
  reviewNote: string | null;
  verifiedBy?: { name: string | null } | null;
}

const BADGE_CLASSES: Record<string, string> = {
  verified: "bg-seagrass/10 text-seagrass border-seagrass/30",
  rejected: "bg-red-50 text-red-600 border-red-200",
  pending: "bg-dry-sage/40 text-dark-slate/60 border-muted-teal/40",
};

// An open-ended period ("since 2005", typical of a total-since-inception
// figure) must not render as a bare start date — that reads as a single day.
function formatPeriod(
  locale: string,
  start: Date | null,
  end: Date | null
): { key: "period" | "periodSince" | "periodUntil"; value: string } | null {
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  if (start && end) return { key: "period", value: `${fmt(start)} – ${fmt(end)}` };
  if (start) return { key: "periodSince", value: fmt(start) };
  if (end) return { key: "periodUntil", value: fmt(end) };
  return null;
}

// Shared between the project's own impact page, the public project panel and
// the site-admin review queue — same claim, same evidence, same badge, so a
// reviewer and a visitor are provably looking at the same thing. `actions`
// is the only per-surface difference.
export async function ImpactReportCard({
  report,
  locale,
  actions,
}: {
  report: ImpactReportCardData;
  locale: string;
  actions?: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "ImpactReportCard" });
  const status = impactReportStatus(report);
  const period = formatPeriod(locale, report.periodStart, report.periodEnd);
  const evidence = safeExternalUrl(report.evidenceUrl);

  return (
    <div className="border border-muted-teal/30 rounded-xl p-4 bg-white">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-wrap items-center gap-1">
          {report.sdgGoals.map((n) => (
            <SdgIcon key={n} n={n} size={26} />
          ))}
        </div>
        <div className="shrink-0 flex flex-wrap justify-end gap-1">
          {report.kind === "SUPPORT_RECEIVED" && (
            <span className="text-[10px] font-semibold uppercase tracking-wide border border-muted-teal/40 bg-dry-sage/30 text-dark-slate/60 rounded-full px-2 py-0.5">
              {t("kindSupportBadge")}
            </span>
          )}
          {report.isCumulative && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wide border border-muted-teal/40 bg-white text-dark-slate/60 rounded-full px-2 py-0.5"
              title={t("cumulativeHint")}
            >
              {t("cumulativeBadge")}
            </span>
          )}
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide border rounded-full px-2 py-0.5 ${BADGE_CLASSES[status]}`}
          >
            {t(`status.${status}`)}
          </span>
        </div>
      </div>

      <p className="text-2xl font-bold text-dark-slate leading-none">
        {/* The qualifier is part of the number, not a footnote — rendering
            "över 25 000" as a bare "25 000" is the overstatement the field
            exists to prevent. */}
        {report.valueQualifier !== "EXACT" && (
          <span className="text-sm font-normal text-dark-slate/50 mr-1">
            {t(`qualifier.${report.valueQualifier}`)}
          </span>
        )}
        {report.metricValue.toLocaleString(locale)}
        {report.metricUnit && (
          <span className="text-sm font-normal text-dark-slate/40 ml-1">{report.metricUnit}</span>
        )}
      </p>
      <p className="text-sm text-dark-slate/70 mt-1">{report.metricDescription}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dark-slate/40">
        {report.sourceName && (
          <span>
            {t(
              report.kind === "SUPPORT_RECEIVED" ? "sourceSupport" : "sourceDelivered",
              { source: report.sourceName }
            )}
          </span>
        )}
        {period && <span>{t(period.key, { period: period.value })}</span>}
        {evidence ? (
          <a
            href={evidence}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-coral hover:underline"
          >
            {t("evidenceLink")}
          </a>
        ) : (
          <span className="italic">{t("noEvidence")}</span>
        )}
        {status === "verified" && report.verifiedAt && (
          <span>
            {t("verifiedBy", {
              name: report.verifiedBy?.name ?? t("theFoundation"),
              date: report.verifiedAt.toLocaleDateString(locale),
            })}
          </span>
        )}
      </div>

      {report.reviewNote && status === "rejected" && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2.5 py-1.5">
          {t("reviewNote", { note: report.reviewNote })}
        </p>
      )}

      {actions && <div className="mt-3 flex items-center gap-3">{actions}</div>}
    </div>
  );
}
