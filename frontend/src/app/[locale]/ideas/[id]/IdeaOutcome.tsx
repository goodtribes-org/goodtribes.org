import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { toDisplayPhase, type ProjectPhaseValue } from "@/lib/projectPhase";

type DrivingProject = { id: string; slug: string; title: string; phase: ProjectPhaseValue; owner: { name: string | null } };

// "Det här blev av idén" (#237): the projects that drive the idea, the
// phase each is in, and their verified delivered results. Figures are shown
// as reported, per project and never summed — a cumulative report overlaps
// its own period reports, the same rule as VerifiedImpactPanel. Support
// received (grants, sponsors) is resources in, not what the idea became.
export default async function IdeaOutcome({ projects, locale }: { projects: DrivingProject[]; locale: string }) {
  if (projects.length === 0) return null;
  const [reports, t, tPhase, tImpact] = await Promise.all([
    prisma.impactReport.findMany({
      where: { projectId: { in: projects.map((p) => p.id) }, verifiedAt: { not: null }, kind: "DELIVERED" },
      orderBy: { verifiedAt: "desc" },
      select: { id: true, projectId: true, metricValue: true, metricUnit: true, metricDescription: true, valueQualifier: true, isCumulative: true },
    }),
    getTranslations({ locale, namespace: "IdeaDetailPage" }),
    getTranslations({ locale, namespace: "ProjectPhase" }),
    getTranslations({ locale, namespace: "VerifiedImpactPanel" }),
  ]);

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-dark-slate">{t("outcomeHeading")}</h2>
      <ul className="flex flex-col gap-3">
        {projects.map((p) => {
          const own = reports.filter((r) => r.projectId === p.id);
          return (
            <li key={p.id} className="rounded-xl border border-muted-teal/30 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/projects/${p.slug}`} className="font-semibold text-seagrass hover:underline">
                  {p.title}
                </Link>
                <span className="rounded-full bg-seagrass/10 px-2.5 py-0.5 text-xs font-medium text-seagrass">{tPhase(toDisplayPhase(p.phase))}</span>
              </div>
              {p.owner.name && <p className="mt-0.5 text-xs text-dark-slate/50">{t("outcomeRunBy", { name: p.owner.name })}</p>}
              {own.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2 border-t border-muted-teal/20 pt-3">
                  {own.map((r) => (
                    <li key={r.id}>
                      <p className="text-base font-bold leading-none text-seagrass">
                        {r.valueQualifier !== "EXACT" && (
                          <span className="mr-1 text-xs font-normal text-dark-slate/50">{tImpact(`qualifier.${r.valueQualifier}`)}</span>
                        )}
                        {r.metricValue.toLocaleString(locale)}
                        {r.metricUnit && <span className="ml-1 text-xs font-normal text-dark-slate/40">{r.metricUnit}</span>}
                      </p>
                      <p className="mt-0.5 text-xs leading-snug text-dark-slate/70">
                        {r.metricDescription}
                        {r.isCumulative && <span className="text-dark-slate/40"> · {tImpact("cumulativeNote")}</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-dark-slate/45">{t("outcomeNoResults")}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
