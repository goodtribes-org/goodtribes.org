import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { forkProject } from "../actions";
import type { Locale } from "next-intl";

export default async function ForkNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ sourceId?: string }>;
}) {
  const { locale } = await params;
  const { sourceId } = await searchParams;
  if (!sourceId) notFound();

  const t = await getTranslations({ locale, namespace: "ForkNewPage" });

  const source = await prisma.project.findUnique({ where: { slug: sourceId }, select: { title: true } });
  if (!source) notFound();
  const sourceTitle = source.title;

  const holderTotals = await prisma.tokenLedger.groupBy({
    by: ["userId"],
    where: { projectSlug: sourceId },
    _sum: { tokens: true },
  });
  const withBalance = holderTotals
    .map((h) => ({ userId: h.userId, weight: h._sum.tokens ?? 0 }))
    .filter((c) => c.weight > 0);
  const totalWeight = withBalance.reduce((sum, c) => sum + c.weight, 0);
  const users = await prisma.user.findMany({
    where: { id: { in: withBalance.map((c) => c.userId) } },
    select: { id: true, name: true },
  });
  const unknownContributor = t("unknownContributor");
  const nameMap = Object.fromEntries(users.map((u) => [u.id, u.name ?? unknownContributor]));
  const contributors = withBalance.map((c) => ({
    userId: c.userId,
    name: nameMap[c.userId] ?? unknownContributor,
    weight: c.weight,
    sharePercent: totalWeight > 0 ? (c.weight / totalWeight) * 100 : 0,
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-slate">{t("heading", { title: sourceTitle })}</h1>
        <p className="text-sm text-dark-slate/60 mt-1">{t("intro")}</p>
      </div>

      <form action={forkProject.bind(null, sourceId)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-dark-slate mb-1">{t("titleLabel")}</label>
          <input
            name="title"
            type="text"
            placeholder={t("titlePlaceholder", { title: sourceTitle })}
            className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>

        {contributors.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-2">
              {t("contributorsHeading")}
            </h2>
            <p className="text-xs text-dark-slate/50 mb-3">{t("contributorsIntro")}</p>
            <div className="flex flex-col gap-2">
              {contributors.map((c) => (
                <div key={c.userId} className="flex items-center gap-3 border border-muted-teal rounded-lg px-4 py-3">
                  <div className="flex-1 min-w-0 text-sm">
                    <span className="font-medium text-dark-slate">{c.name}</span>
                    <span className="text-dark-slate/50 ml-2">{t("sharePercent", { percent: c.sharePercent.toFixed(1) })}</span>
                  </div>
                  <input
                    name={`grant_${c.userId}`}
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder={t("optionalTokensPlaceholder")}
                    className="w-32 border border-muted-teal rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="bg-coral text-white text-sm font-medium px-5 py-2.5 rounded hover:bg-watermelon transition-colors"
        >
          {t("submitButton")}
        </button>
      </form>
    </div>
  );
}
