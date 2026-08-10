export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Lean Canvas-utkast — GoodTribes.org",
};

function timeAgo(date: Date, t: Awaited<ReturnType<typeof getTranslations>>): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return t("listTimeJustNow");
  const m = Math.floor(s / 60);
  if (m < 60) return t("listTimeMinutesAgo", { minutes: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("listTimeHoursAgo", { hours: h });
  return t("listTimeDaysAgo", { days: Math.floor(h / 24) });
}

export default async function LeanCanvasListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const t = await getTranslations({ locale, namespace: "LeanCanvasDraftPage" });

  // Open by design — every not-yet-promoted draft is listed, not just the
  // viewer's own, same as /ideaverkstad and /whiteboard.
  const drafts = await prisma.leanCanvasDraft.findMany({
    where: { promotedToProjectSlug: null },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { owner: { select: { name: true } } },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">{t("listHeading")}</h1>
          <p className="text-sm text-dark-slate/50 mt-1">{t("listSubtitle")}</p>
        </div>
        <Link
          href="/lean-canvas/new"
          className="px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors flex-shrink-0"
        >
          {t("newCta")}
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-lg p-16 text-center">
          <p className="text-dark-slate/40 text-sm mb-3">{t("listEmptyState")}</p>
          <Link href="/lean-canvas/new" className="text-coral hover:underline text-sm">
            {t("listStartFirst")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {drafts.map((d) => (
            <Link
              key={d.id}
              href={`/lean-canvas/${d.id}`}
              className="flex items-center justify-between gap-3 border border-muted-teal/40 rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-dark-slate truncate">{d.problem?.slice(0, 80) || t("listStartedBy", { name: d.owner.name ?? t("unknownAuthor") })}</p>
                <p className="text-xs text-dark-slate/40 mt-0.5">{t("listStartedBy", { name: d.owner.name ?? t("unknownAuthor") })}</p>
              </div>
              <span className="text-xs text-dark-slate/40 flex-shrink-0">{timeAgo(d.updatedAt, t)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
