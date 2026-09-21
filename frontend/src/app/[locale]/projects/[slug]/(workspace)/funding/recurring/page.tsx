export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { formatCurrency } from "@/lib/currency";
import { sumByInterval } from "@/lib/recurringFunding";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";
import AddRecurringFundingForm from "./AddRecurringFundingForm";
import EndSourceButton from "./EndSourceButton";
import type { Locale } from "next-intl";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Återkommande finansiering — GoodTribes.org` };
}

export default async function RecurringFundingPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "RecurringFundingPage" }),
  ]);

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, recurringFundingSources: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) return null;

  const canManage = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;

  const active = project.recurringFundingSources.filter((s) => !s.endedAt);
  const ended = project.recurringFundingSources.filter((s) => s.endedAt);
  const totals = sumByInterval(active);

  const INTERVAL_LABEL: Record<string, string> = {
    MONTHLY: t("intervalMonthly"),
    QUARTERLY: t("intervalQuarterly"),
    ANNUALLY: t("intervalAnnually"),
    OTHER: t("intervalOther"),
  };
  const TYPE_LABEL: Record<string, string> = {
    MEMBERSHIP_FEES: t("typeMembershipFees"),
    GRANT: t("typeGrant"),
    SUBSCRIPTION: t("typeSubscription"),
    REVENUE_SHARE: t("typeRevenueShare"),
    OTHER: t("typeOther"),
  };

  return (
    <div className="max-w-2xl">
      <Link href={`/projects/${slug}/funding`} className="text-sm text-dark-slate/50 hover:text-dark-slate">
        {t("backToFunding")}
      </Link>
      <WorkspacePageHeader title={t("heading")} help={t("helpText")} />

      {Object.keys(totals).length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          {Object.entries(totals).map(([interval, amount]) => (
            <div key={interval} className="border border-muted-teal/40 rounded-lg px-4 py-2 bg-white">
              <p className="text-lg font-bold text-dark-slate">{formatCurrency(amount, "SEK", locale)}</p>
              <p className="text-xs text-dark-slate/40">{INTERVAL_LABEL[interval] ?? interval}</p>
            </div>
          ))}
        </div>
      )}

      {canManage && <AddRecurringFundingForm projectSlug={slug} />}

      {active.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-lg p-8 text-center mt-4">
          <p className="text-dark-slate/40 text-sm">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-4">
          {active.map((s) => (
            <div key={s.id} className="border border-muted-teal/40 rounded-lg p-4 bg-white flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-dark-slate">{s.label}</p>
                <p className="text-xs text-dark-slate/40 mt-0.5">
                  {TYPE_LABEL[s.type] ?? s.type} · {formatCurrency(s.amountSek, "SEK", locale)} / {INTERVAL_LABEL[s.interval] ?? s.interval}
                  {s.sourceName ? ` · ${s.sourceName}` : ""}
                </p>
                {s.note && <p className="text-sm text-dark-slate/60 mt-1">{s.note}</p>}
              </div>
              {canManage && <EndSourceButton id={s.id} projectSlug={slug} />}
            </div>
          ))}
        </div>
      )}

      {ended.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold text-dark-slate/40 uppercase tracking-wide mb-2">{t("endedHeading")}</h2>
          <div className="flex flex-col gap-2">
            {ended.map((s) => (
              <div key={s.id} className="border border-muted-teal/20 rounded-lg p-3 opacity-60">
                <p className="text-sm text-dark-slate">{s.label}</p>
                <p className="text-xs text-dark-slate/40">
                  {formatCurrency(s.amountSek, "SEK", locale)} / {INTERVAL_LABEL[s.interval] ?? s.interval}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
