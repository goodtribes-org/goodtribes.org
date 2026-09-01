import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { ImpactReportCard } from "@/components/ImpactReportCard";
import { PENDING_REPORT_WHERE } from "@/lib/impactReports";
import { verifyImpactReport, rejectImpactReport } from "./actions";
import type { Locale } from "next-intl";

const REVIEWED_TAKE = 20;

export default async function ImpactReportsAdminPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const [pending, reviewed, t] = await Promise.all([
    prisma.impactReport.findMany({
      where: PENDING_REPORT_WHERE,
      orderBy: { createdAt: "asc" },
      include: {
        project: { select: { title: true, slug: true } },
        createdBy: { select: { name: true } },
        verifiedBy: { select: { name: true } },
      },
    }),
    prisma.impactReport.findMany({
      where: { OR: [{ verifiedAt: { not: null } }, { rejectedAt: { not: null } }] },
      orderBy: { createdAt: "desc" },
      take: REVIEWED_TAKE,
      include: {
        project: { select: { title: true, slug: true } },
        verifiedBy: { select: { name: true } },
      },
    }),
    getTranslations({ locale, namespace: "ImpactReportsAdminPage" }),
  ]);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
        <p className="text-sm text-dark-slate/60 mt-1">{t("intro")}</p>
      </div>

      <section className="mb-12">
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          {t("pendingHeading", { count: pending.length })}
        </h2>

        {pending.length === 0 ? (
          <p className="text-sm text-dark-slate/40">{t("emptyState")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((report) => (
              <div key={report.id}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <Link
                    href={`/projects/${report.project.slug}/impact`}
                    className="text-sm font-semibold text-dark-slate hover:text-coral transition-colors"
                  >
                    {report.project.title}
                  </Link>
                  <span className="text-xs text-dark-slate/40">
                    {t("submittedBy", {
                      name: report.createdBy?.name ?? "—",
                      date: report.createdAt.toLocaleDateString(locale),
                    })}
                  </span>
                </div>

                <ImpactReportCard
                  report={report}
                  locale={locale}
                  actions={
                    <div className="flex flex-col gap-2 w-full">
                      <form
                        action={async (formData: FormData) => {
                          "use server";
                          await verifyImpactReport(report.id, (formData.get("note") as string) ?? "");
                        }}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input
                          name="note"
                          type="text"
                          placeholder={t("verifyNotePlaceholder")}
                          className="flex-1 min-w-40 border border-muted-teal rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
                        />
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded bg-coral text-white text-xs font-medium hover:bg-watermelon transition-colors"
                        >
                          {t("verifyButton")}
                        </button>
                      </form>

                      <form
                        action={async (formData: FormData) => {
                          "use server";
                          await rejectImpactReport(report.id, (formData.get("note") as string) ?? "");
                        }}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input
                          name="note"
                          type="text"
                          required
                          placeholder={t("rejectNotePlaceholder")}
                          className="flex-1 min-w-40 border border-muted-teal rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
                        />
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                        >
                          {t("rejectButton")}
                        </button>
                      </form>
                    </div>
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          {t("reviewedHeading")}
        </h2>
        {reviewed.length === 0 ? (
          <p className="text-sm text-dark-slate/40">{t("reviewedEmptyState")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {reviewed.map((report) => (
              <div key={report.id}>
                <Link
                  href={`/projects/${report.project.slug}/impact`}
                  className="text-xs font-semibold text-dark-slate/60 hover:text-coral transition-colors"
                >
                  {report.project.title}
                </Link>
                <div className="mt-1">
                  <ImpactReportCard report={report} locale={locale} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
