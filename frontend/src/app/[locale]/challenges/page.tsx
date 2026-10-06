export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/metadata";
import { CHALLENGE_CARD_SELECT, PUBLIC_CHALLENGE_WHERE } from "@/lib/challenges";
import ChallengeCard from "@/components/challenges/ChallengeCard";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Challenges" });
  return buildMetadata({ locale, path: "/challenges", title: t("listTitle"), description: t("listIntro") });
}

// Utmaningar (#228): open ones first (closing soonest first), then the
// most recently closed.
export default async function ChallengesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Challenges" });
  const now = new Date();
  const [open, closed] = await Promise.all([
    prisma.challenge.findMany({ where: { ...PUBLIC_CHALLENGE_WHERE, closesAt: { gt: now } }, orderBy: { closesAt: "asc" }, select: CHALLENGE_CARD_SELECT }),
    prisma.challenge.findMany({ where: { ...PUBLIC_CHALLENGE_WHERE, closesAt: { lte: now } }, orderBy: { closesAt: "desc" }, take: 24, select: CHALLENGE_CARD_SELECT }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold text-dark-slate">{t("listTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-dark-slate/70">{t("listIntro")}</p>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-dark-slate/60">{t("openHeading")}</h2>
      {open.length === 0 ? (
        <p className="mt-3 text-sm text-dark-slate/50">{t("noneOpen")}</p>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {open.map((c) => <ChallengeCard key={c.slug} challenge={c} locale={locale} />)}
        </div>
      )}

      {closed.length > 0 && (
        <>
          <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-dark-slate/60">{t("closedHeading")}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {closed.map((c) => <ChallengeCard key={c.slug} challenge={c} locale={locale} />)}
          </div>
        </>
      )}
    </div>
  );
}
