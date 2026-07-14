export const revalidate = 60;

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma"
import { SdgIcon } from "@/components/SdgIcon";

export const metadata: Metadata = {
  title: "Hall of Impact — GoodTribes.org",
  description: "Projekt som förändrat världen",
};

export default async function HallOfImpactPage() {
  const projects = await prisma.project.findMany({
    where: { status: { in: ["DELIVERY", "ARCHIVED"] } },
    include: {
      alumni: { select: { id: true } },
      impactMetrics: {
        select: { label: true, unit: true, currentValue: true },
        orderBy: { currentValue: "desc" },
        take: 2,
      },
      maturity: { select: { score: true } },
      _count: { select: { members: true } },
    },
    orderBy: [
      { maturity: { score: "desc" } },
      { createdAt: "desc" },
    ],
  });

  const totalAlumni = await prisma.projectAlumni.count();

  return (
    <div className="max-w-5xl space-y-10">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-dark-slate mb-2">Hall of Impact</h1>
        <p className="text-dark-slate/50 text-sm mb-6">Projekt som förändrat världen</p>

        <div className="grid grid-cols-3 gap-3 sm:inline-flex sm:gap-8 bg-dry-sage/30 rounded-xl px-4 sm:px-8 py-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-seagrass">{projects.length}</p>
            <p className="text-xs text-dark-slate/50 mt-0.5">Avslutade projekt</p>
          </div>
          <div className="hidden sm:block w-px bg-muted-teal/30" />
          <div className="text-center">
            <p className="text-2xl font-bold text-seagrass">{totalAlumni}</p>
            <p className="text-xs text-dark-slate/50 mt-0.5">Bidragsgivare totalt</p>
          </div>
          <div className="hidden sm:block w-px bg-muted-teal/30" />
          <div className="text-center">
            <p className="text-2xl font-bold text-seagrass">
              {projects.reduce((sum, p) => sum + p.impactMetrics.length, 0)}
            </p>
            <p className="text-xs text-dark-slate/50 mt-0.5">Impact-mätvärden</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      {projects.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-xl p-16 text-center">
          <p className="text-4xl mb-4">🏆</p>
          <p className="text-dark-slate/40 text-sm">
            Inga avslutade projekt ännu. De bästa projekten hamnar här.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              className="flex flex-col border border-muted-teal/40 rounded-xl overflow-hidden bg-white hover:shadow-lg hover:border-muted-teal transition-all group"
            >
              {/* Image placeholder */}
              <div className="aspect-video bg-gradient-to-br from-seagrass/20 to-muted-teal/20 flex items-center justify-center relative overflow-hidden">
                {project.imageUrl ? (
                  <img
                    src={project.imageUrl}
                    alt={project.title}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-3xl">🌍</span>
                )}
                {/* Maturity badge */}
                {project.maturity && (
                  <div className="absolute top-2 right-2 bg-white/90 text-xs font-bold px-2 py-0.5 rounded-full text-seagrass border border-seagrass/30">
                    {project.maturity.score}/100
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 p-4 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-dark-slate text-sm leading-snug group-hover:text-coral transition-colors">
                    {project.title}
                  </p>
                  {project.category && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-dry-sage/40 text-dark-slate/60 rounded px-1.5 py-0.5 flex-shrink-0">
                      {project.category}
                    </span>
                  )}
                </div>

                {/* SDG badges */}
                {project.sdgGoals.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[9px] font-medium text-dark-slate/40 mr-0.5">Agenda 2030:</span>
                    {project.sdgGoals.slice(0, 7).map((n) => (
                      <SdgIcon key={n} n={n} size={24} />
                    ))}
                  </div>
                )}

                {/* Impact metrics */}
                {project.impactMetrics.length > 0 && (
                  <div className="space-y-1 mt-1">
                    {project.impactMetrics.map((m) => (
                      <div key={m.label} className="flex items-center gap-1.5">
                        <span className="text-seagrass font-bold text-xs">
                          {m.currentValue.toLocaleString("sv-SE")}
                        </span>
                        <span className="text-xs text-dark-slate/50">
                          {m.unit} {m.label.toLowerCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-auto pt-2 flex items-center justify-between text-xs text-dark-slate/40">
                  <span>
                    {project.alumni.length} bidragsgivare
                  </span>
                  <span className="text-coral group-hover:underline text-xs font-medium">
                    Läs mer →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
