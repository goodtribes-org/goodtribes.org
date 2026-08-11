export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getImpactFundBalance } from "@/lib/impactFund";
import { getGtBalance } from "@/lib/tokens";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import ImpactFundVoteForm from "./ImpactFundVoteForm";
import type { Locale } from "next-intl";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ImpactFundPage" });
  return buildMetadata({ locale, path: "/impact-fond", title: t("heading"), description: t("pageDescription") });
}

function formatSek(amount: number) {
  return `${amount.toLocaleString("sv-SE")} kr`;
}

export default async function ImpactFundPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "ImpactFundPage" }),
  ]);
  const userId = session?.user?.id ?? null;

  const [balance, entries, openPoll] = await Promise.all([
    getImpactFundBalance(),
    prisma.impactFundLedger.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        targetProject: { select: { title: true, slug: true } },
      },
    }),
    prisma.platformPoll.findFirst({
      where: { type: "impact_fund_allocation", status: "open" },
      include: { options: { include: { linkedProject: { select: { title: true } } } } },
    }),
  ]);

  let gtBalance = 0;
  let existingVotes: { optionId: string; weight: number }[] = [];
  if (userId && openPoll) {
    [gtBalance, existingVotes] = await Promise.all([
      getGtBalance(userId).then((b) => Math.max(b, 1)),
      prisma.platformPollVote
        .findMany({
          where: { pollId: openPoll.id, userId },
          select: { pollOptionId: true, gtWeight: true },
        })
        .then((rows) => rows.map((r) => ({ optionId: r.pollOptionId, weight: r.gtWeight }))),
    ]);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-dark-slate mb-2">{t("heading")}</h1>
        <p className="text-dark-slate/50 text-sm mb-4">{t("intro")}</p>
        <div className="inline-flex bg-dry-sage/30 rounded-xl px-8 py-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-seagrass">{formatSek(balance)}</p>
            <p className="text-xs text-dark-slate/50 mt-0.5">{t("currentBalance")}</p>
          </div>
        </div>
      </div>

      {openPoll && (
        <div>
          {userId ? (
            <ImpactFundVoteForm
              pollId={openPoll.id}
              candidates={openPoll.options.map((o) => ({ optionId: o.id, label: o.linkedProject?.title ?? o.label }))}
              gtBalance={gtBalance}
              existingVotes={existingVotes}
            />
          ) : (
            <p className="text-sm text-dark-slate/40 text-center">{t("votingOpenLoginPrompt")}</p>
          )}
        </div>
      )}

      <div className="border border-muted-teal rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-dark-slate/[0.03] border-b border-muted-teal">
          <h2 className="text-sm font-semibold text-dark-slate">{t("transactionsHeading")}</h2>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-dark-slate/40 p-4">{t("emptyState")}</p>
        ) : (
          <div className="divide-y divide-muted-teal/50">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-dark-slate">
                    {e.direction === "in" ? t("directionIn") : t("directionOut")}
                    {e.targetProject && ` — ${e.targetProject.title}`}
                  </p>
                  {e.note && <p className="text-xs text-dark-slate/50 truncate">{e.note}</p>}
                  <p className="text-xs text-dark-slate/40">
                    {e.createdAt.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold shrink-0 ${
                    e.direction === "in" ? "text-seagrass" : "text-coral"
                  }`}
                >
                  {e.direction === "in" ? "+" : "-"}
                  {formatSek(e.amountSek)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
