export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { AddMetricForm, UpdateMetricForm } from "./ImpactForms";
import { isLeadRole } from "@/lib/authz";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { title: true },
  });
  if (!project) return {};
  const t = await getTranslations({ locale, namespace: "ImpactPage" });
  return { title: t("pageTitle", { title: project.title }) };
}

function formatRelative(date: Date, t: ReturnType<typeof useTranslations>) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t("justNow");
  if (mins < 60) return t("minutesAgo", { minutes: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("hoursAgo", { hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("daysAgo", { days });
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="#3d8b7a"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((v - min) / range) * height;
        return (
          <circle key={i} cx={x} cy={y} r={2.5} fill="#3d8b7a" />
        );
      })}
    </svg>
  );
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min(Math.round((current / target) * 100), 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-dark-slate/50 mb-1">
        <span>{current.toLocaleString("sv-SE")} / {target.toLocaleString("sv-SE")}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-seagrass transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function ImpactPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: "ImpactPage" });
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      title: true,
      members: session?.user?.id
        ? { where: { userId: session.user.id }, select: { role: true } }
        : false,
      impactMetrics: {
        orderBy: { createdAt: "asc" },
        include: {
          updates: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
              updatedBy: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!project) notFound();

  const role = ((project.members ?? []) as { role: string }[])[0]?.role;
  const isOwnerOrAdmin = isLeadRole(role);

  const metrics = project.impactMetrics;
  const totalMetrics = metrics.length;

  // Find most recent update across all metrics
  const allUpdates = metrics.flatMap((m) => m.updates);
  const lastUpdated =
    allUpdates.length > 0
      ? allUpdates.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).createdAt
      : null;

  return (
    <div>
      {/* Back nav */}
      <div className="mb-4">
        <Link
          href={`/projects/${slug}`}
          className="text-xs text-dark-slate/40 hover:text-dark-slate transition-colors"
        >
          ← {project.title}
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-dark-slate">{t("heading")}</h1>
          {totalMetrics > 0 && (
            <p className="text-xs text-dark-slate/50 mt-0.5">
              {t("metricsCount", { count: totalMetrics })}
              {lastUpdated && (
                <> &middot; {t("lastUpdatedAt", { time: formatRelative(lastUpdated, t) })}</>
              )}
            </p>
          )}
        </div>
        {isOwnerOrAdmin && (
          <AddMetricForm projectSlug={slug} />
        )}
      </div>

      {/* Summary stats */}
      {totalMetrics > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <div className="border border-muted-teal/30 rounded-lg p-3 bg-white text-center">
            <p className="text-2xl font-bold text-dark-slate">{totalMetrics}</p>
            <p className="text-xs text-dark-slate/50 mt-0.5">{t("metricsLabel")}</p>
          </div>
          <div className="border border-muted-teal/30 rounded-lg p-3 bg-white text-center">
            <p className="text-2xl font-bold text-dark-slate">{allUpdates.length}</p>
            <p className="text-xs text-dark-slate/50 mt-0.5">{t("updatesTotalLabel")}</p>
          </div>
          <div className="border border-muted-teal/30 rounded-lg p-3 bg-white text-center col-span-2 sm:col-span-1">
            <p className="text-2xl font-bold text-dark-slate">
              {lastUpdated ? formatRelative(lastUpdated, t) : "—"}
            </p>
            <p className="text-xs text-dark-slate/50 mt-0.5">{t("lastUpdatedLabel")}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {metrics.length === 0 && (
        <div className="text-center py-16 border border-dashed border-muted-teal/40 rounded-xl">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm font-semibold text-dark-slate mb-1">{t("emptyStateTitle")}</p>
          <p className="text-xs text-dark-slate/50 max-w-sm mx-auto leading-relaxed">
            {t("emptyStateDescription")}
          </p>
          {isOwnerOrAdmin && (
            <div className="mt-4 flex justify-center">
              <AddMetricForm projectSlug={slug} />
            </div>
          )}
        </div>
      )}

      {/* Metrics list */}
      <div className="space-y-4">
        {metrics.map((metric) => {
          const sparkValues = [...metric.updates]
            .reverse()
            .map((u) => u.value);

          return (
            <div
              key={metric.id}
              className="border border-muted-teal/30 rounded-xl p-5 bg-white"
            >
              {/* Top row: label + unit + sparkline */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-sm font-semibold text-dark-slate">
                    {metric.label}
                    <span className="font-normal text-dark-slate/40 ml-1 text-xs">
                      &middot; {metric.unit}
                    </span>
                  </p>
                  {metric.description && (
                    <p className="text-xs text-dark-slate/50 mt-0.5">{metric.description}</p>
                  )}
                </div>
                <div className="shrink-0 pt-0.5">
                  <Sparkline values={sparkValues} />
                </div>
              </div>

              {/* Current value */}
              <p className="text-4xl font-bold text-dark-slate leading-none mb-3">
                {metric.currentValue.toLocaleString("sv-SE")}
                <span className="text-sm font-normal text-dark-slate/40 ml-1">{metric.unit}</span>
              </p>

              {/* Progress bar */}
              {metric.targetValue !== null && metric.targetValue > 0 && (
                <div className="mb-4">
                  <ProgressBar
                    current={metric.currentValue}
                    target={metric.targetValue}
                  />
                </div>
              )}

              {/* Recent updates */}
              {metric.updates.length > 0 && (
                <div className="border-t border-muted-teal/20 pt-3 space-y-1.5">
                  <p className="text-xs font-medium text-dark-slate/50 uppercase tracking-wide mb-2">
                    {t("recentUpdatesLabel")}
                  </p>
                  {metric.updates.map((upd) => (
                    <div key={upd.id} className="flex items-baseline gap-2 text-xs">
                      <span className="font-semibold text-dark-slate">
                        {upd.value.toLocaleString("sv-SE")} {metric.unit}
                      </span>
                      {upd.note && (
                        <span className="text-dark-slate/60 truncate">{upd.note}</span>
                      )}
                      <span className="text-dark-slate/30 shrink-0 ml-auto">
                        {upd.updatedBy.name ?? "—"} &middot; {formatRelative(upd.createdAt, t)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Update button */}
              {isOwnerOrAdmin && (
                <div className="mt-3">
                  <UpdateMetricForm
                    metricId={metric.id}
                    projectSlug={slug}
                    currentValue={metric.currentValue}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
