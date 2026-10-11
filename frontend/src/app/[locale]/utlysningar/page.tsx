export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { FundingApplicantType } from "@prisma/client";
import type { Locale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/metadata";
import { CALL_CARD_SELECT, CALL_ORDER, publicCallWhere } from "@/lib/fundingCalls/public";
import { APPLICANT_TYPES } from "@/lib/fundingCalls/analyze";
import FundingCallCard from "@/components/fundingCalls/FundingCallCard";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FundingCalls" });
  return buildMetadata({ locale, path: "/utlysningar", title: t("listTitle"), description: t("listIntro") });
}

// Utlysningar (#344): every open call, closing soonest first, filterable on
// who may apply. The start page shows the first ten and links here.
export default async function FundingCallsPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ vem?: string }> }) {
  const { locale } = await params;
  const { vem } = await searchParams;
  const t = await getTranslations({ locale, namespace: "FundingCalls" });
  const who = APPLICANT_TYPES.includes(vem as FundingApplicantType) ? (vem as FundingApplicantType) : null;
  const calls = await prisma.fundingCall.findMany({
    where: { ...publicCallWhere(), ...(who ? { applicantTypes: { has: who } } : {}) },
    orderBy: CALL_ORDER,
    select: CALL_CARD_SELECT,
  });
  const chip = (value: string | null, label: string) => (
    <Link
      key={value ?? "all"}
      href={value ? `/utlysningar?vem=${value}` : "/utlysningar"}
      className={`rounded-full border px-3 py-1 text-xs ${who === value ? "border-seagrass bg-seagrass/10 font-semibold text-seagrass" : "border-muted-teal/40 text-dark-slate/60 hover:border-seagrass"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-3xl font-bold text-dark-slate">{t("listTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-dark-slate/70">{t("listIntro")}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {chip(null, t("filterAll"))}
        {(["COMPANY", "NONPROFIT", "UNIVERSITY", "MUNICIPALITY", "CONSORTIUM"] as const).map((a) => chip(a, t(`applicant.${a}`)))}
      </div>
      {calls.length === 0 ? (
        <p className="mt-8 text-sm text-dark-slate/50">{t("noneOpen")}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {calls.map((c) => (
            <div key={c.slug} className="flex">
              <FundingCallCard call={c} />
            </div>
          ))}
        </div>
      )}
      <p className="mt-10 text-xs text-dark-slate/50">{t("sourceNote")}</p>
    </div>
  );
}
