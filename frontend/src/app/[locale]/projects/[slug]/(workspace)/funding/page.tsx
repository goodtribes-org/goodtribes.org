export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import type { Metadata } from "next";
import { isStripeConfigured } from "@/lib/stripe";
import { isLeadRole } from "@/lib/authz";
import { formatCurrency, formatSecondaryConversion, suggestCurrencyForCountry } from "@/lib/currency";
import { createCampaign, pledge, closeCampaign, addExpense } from "./actions";
import PledgeForm from "./PledgeForm";
import ConnectStripeButton from "./ConnectStripeButton";


export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  const t = await getTranslations({ locale, namespace: "FundingPage" });
  return { title: t("pageTitle", { projectTitle: project.title }) };
}

function daysLeft(deadline: Date): number {
  const ms = deadline.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default async function FundingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const locale = await getLocale();
  const t = await getTranslations("FundingPage");
  const fmt = (amount: number, currency: string) => formatCurrency(amount, currency, locale);

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      members: userId ? { where: { userId } } : { where: { role: "FOUNDER" } },
      milestones: { select: { id: true, title: true }, orderBy: { createdAt: "asc" } },
      fundingCampaign: {
        include: {
          pledges: {
            include: { user: { select: { name: true } }, rewardTier: { select: { id: true, title: true } } },
            orderBy: { createdAt: "desc" },
          },
          rewardTiers: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { pledges: true } } } },
          expenses: { orderBy: { date: "desc" }, include: { milestone: { select: { title: true } } } },
        },
      },
    },
  });
  if (!project) notFound();

  const myRole = project.members[0]?.role ?? null;
  const isOwnerOrAdmin = isLeadRole(myRole);
  const isMember = !!myRole;
  const campaign = project.fundingCampaign;
  const stripeReady = isStripeConfigured();

  const confirmedPledges = campaign?.pledges.filter((p) => p.pledgeStatus === "confirmed") ?? [];
  const raised = confirmedPledges.reduce((s, p) => s + p.amount, 0);
  const pct = campaign ? Math.min(100, Math.round((raised / campaign.goal) * 100)) : 0;
  const myPledges = campaign?.pledges.filter((p) => p.userId === userId && p.pledgeStatus === "confirmed") ?? [];
  const myTotal = myPledges.reduce((s, p) => s + p.amount, 0);

  const progressColor =
    pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-seagrass";

  // ── No campaign yet ──────────────────────────────────────────────────────────
  if (!campaign) {
    if (!isOwnerOrAdmin) {
      return (
        <div className="max-w-xl">
          <h1 className="text-xl font-bold text-dark-slate mb-4">{t("heading")}</h1>
          <p className="text-dark-slate/40 text-sm">
            {t("noCampaignYet")}
          </p>
        </div>
      );
    }

    const creator = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { country: true } })
      : null;
    const suggestedCurrency = suggestCurrencyForCountry(creator?.country);

    return (
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-dark-slate mb-6">{t("heading")}</h1>
        <div className="border border-dashed border-muted-teal/50 rounded-xl p-8">
          <h2 className="font-semibold text-dark-slate mb-1">{t("startCampaignHeading")}</h2>
          <p className="text-sm text-dark-slate/50 mb-6">
            {t("startCampaignSubtitle")}
          </p>
          <form action={createCampaign.bind(null, project.id, slug)} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("campaignNameLabel")}</label>
              <input
                name="title"
                required
                className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                placeholder={t("campaignNamePlaceholder")}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("descriptionLabel")}</label>
              <textarea
                name="description"
                rows={3}
                className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass resize-none"
                placeholder={t("descriptionPlaceholder")}
              />
            </div>

            {/* Goal + Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("goalLabel")}</label>
                <input
                  name="goal"
                  type="number"
                  min="1"
                  required
                  className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                  placeholder="50000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("currencyLabel")}</label>
                <select
                  name="currency"
                  defaultValue={suggestedCurrency}
                  className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass bg-white"
                >
                  <option value="SEK">SEK</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="NOK">NOK</option>
                  <option value="DKK">DKK</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="CHF">CHF</option>
                </select>
              </div>
            </div>

            {/* Type + Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("campaignTypeLabel")}</label>
                <select
                  name="campaignType"
                  defaultValue="donation"
                  className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass bg-white"
                  id="campaignTypeSelect"
                >
                  <option value="donation">{t("campaignTypeDonation")}</option>
                  <option value="reward">{t("campaignTypeReward")}</option>
                  <option value="token">{t("campaignTypeToken")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("deadlineLabel")}</label>
                <input
                  name="deadline"
                  type="date"
                  className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                />
              </div>
            </div>

            {/* Token exchange rate (only meaningful for token-based campaigns) */}
            <div>
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">
                {t("tokenExchangeRateLabel")}
              </label>
              <input
                name="tokenExchangeRate"
                type="number"
                min="1"
                step="0.01"
                placeholder={t("tokenExchangeRatePlaceholder")}
                className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
              />
            </div>

            {/* Platform fee (read-only) */}
            <div>
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("platformFeeLabel")}</label>
              <input type="hidden" name="platformFee" value="5" />
              <p className="text-sm text-dark-slate/50 border border-muted-teal/30 rounded-md px-3 py-2 bg-dry-sage/30">
                {t("platformFeeNote")}
              </p>
            </div>

            {/* Reward tiers (static form rows; JS-free server action approach) */}
            <div className="border border-muted-teal/30 rounded-lg p-4 space-y-4">
              <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest">
                {t("rewardTiersHeading")}
              </p>
              <p className="text-xs text-dark-slate/40">
                {t("rewardTiersHint")}
              </p>
              {[0, 1, 2].map((i) => (
                <div key={i} className="grid grid-cols-2 gap-3 border-t border-muted-teal/20 pt-4 first:border-t-0 first:pt-0">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("tierTitleLabel")}</label>
                    <input
                      name="tierTitle"
                      className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                      placeholder={t("tierTitlePlaceholder", { number: i + 1 })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("tierMinAmountLabel")}</label>
                    <input
                      name="tierMinAmount"
                      type="number"
                      min="1"
                      className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                      placeholder="500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("tierMaxBackersLabel")}</label>
                    <input
                      name="tierMaxBackers"
                      type="number"
                      min="1"
                      className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                      placeholder={t("tierMaxBackersPlaceholder")}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("tierDescriptionLabel")}</label>
                    <input
                      name="tierDescription"
                      className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                      placeholder={t("tierDescriptionPlaceholder")}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="bg-coral text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-watermelon transition-colors"
            >
              {t("startCampaignButton")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Campaign exists ──────────────────────────────────────────────────────────
  const remaining = campaign.deadline ? daysLeft(campaign.deadline) : null;
  const raisedSecondary = await formatSecondaryConversion(raised, campaign.currency, locale);

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold text-dark-slate mb-6">{t("heading")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT: main campaign info + pledge */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero */}
          <div className="border border-muted-teal/40 rounded-xl p-6 space-y-5">
            {/* Title + badges */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-dark-slate text-xl">{campaign.title}</h2>
                {campaign.description && (
                  <p className="text-sm text-dark-slate/60 mt-1 leading-relaxed">{campaign.description}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
                <span
                  className={[
                    "text-xs px-2 py-1 rounded-full font-medium",
                    campaign.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-dry-sage text-dark-slate/60",
                  ].join(" ")}
                >
                  {campaign.status === "active" ? t("statusActive") : t("statusClosed")}
                </span>
                {campaign.deadline && (
                  <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">
                    {remaining === 0
                      ? t("lastDay")
                      : remaining === null
                      ? ""
                      : t("daysLeft", { days: remaining })}
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="h-3 bg-dry-sage rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progressColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {/* Stats row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-slate/50 mt-2">
                <span>
                  <span className="font-semibold text-dark-slate text-sm">{fmt(raised, campaign.currency)}</span>
                  {raisedSecondary && (
                    <span className="text-dark-slate/40"> {t("approxConversion", { value: raisedSecondary })}</span>
                  )}{" "}
                  {t("raisedOfGoal", { goal: fmt(campaign.goal, campaign.currency), pct })}
                </span>
                <span>·</span>
                <span>
                  <span className="font-semibold text-dark-slate">{confirmedPledges.length}</span>{" "}
                  {t("backersCount", { count: confirmedPledges.length })}
                </span>
                {remaining !== null && (
                  <>
                    <span>·</span>
                    <span>
                      {campaign.status === "closed"
                        ? t("statusClosed")
                        : remaining === 0
                        ? t("lastDay")
                        : t("daysLeft", { days: remaining })}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Stripe Connect onboarding (owner/admin only) */}
            {isOwnerOrAdmin && stripeReady && campaign.stripeOnboardingStatus !== "complete" && (
              <div className="border-t border-muted-teal/20 pt-5">
                <ConnectStripeButton
                  campaignId={campaign.id}
                  slug={slug}
                  status={campaign.stripeOnboardingStatus}
                />
              </div>
            )}

            {/* Pledge section */}
            {campaign.status === "active" && (
              <div className="border-t border-muted-teal/20 pt-5">
                {!userId ? (
                  <p className="text-sm text-dark-slate/50">
                    <a href="/login" className="text-coral hover:underline">{t("loginPrompt")}</a> {t("loginToSupportSuffix")}
                  </p>
                ) : stripeReady && campaign.stripeOnboardingStatus === "complete" ? (
                  <>
                    <p className="text-sm font-medium text-dark-slate mb-3">
                      {myTotal > 0
                        ? t("myContributionTotal", { amount: fmt(myTotal, campaign.currency), count: myPledges.length })
                        : t("supportProject")}
                    </p>
                    <PledgeForm
                      campaignId={campaign.id}
                      currency={campaign.currency}
                      rewardTiers={
                        campaign.campaignType === "reward"
                          ? campaign.rewardTiers.map((t) => ({
                              id: t.id,
                              title: t.title,
                              description: t.description,
                              minAmount: t.minAmount,
                              maxBackers: t.maxBackers,
                              _count: t._count,
                            }))
                          : undefined
                      }
                      platformFee={campaign.platformFee}
                      tokenExchangeRate={campaign.tokenExchangeRate ?? undefined}
                    />
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      <span>{t("paymentNotConfigured")}</span>
                    </div>
                    <p className="text-sm font-medium text-dark-slate">
                      {myTotal > 0
                        ? t("myContributionTotalManual", { amount: fmt(myTotal, campaign.currency), count: myPledges.length })
                        : t("pledgeYourSupport")}
                    </p>
                    <form action={pledge.bind(null, campaign.id, slug)} className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          name="amount"
                          type="number"
                          min="1"
                          placeholder={t("amountPlaceholder", { currency: campaign.currency })}
                          required
                          className="flex-1 border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                        />
                        <button
                          type="submit"
                          className="bg-seagrass text-white text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity whitespace-nowrap"
                        >
                          {t("pledgeButton")}
                        </button>
                      </div>
                      <input
                        name="message"
                        className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                        placeholder={t("messagePlaceholder")}
                      />
                    </form>
                    {myPledges.length > 0 && (
                      <ul className="text-xs text-dark-slate/50 space-y-1 pt-1">
                        {myPledges.map((p) => (
                          <li key={p.id}>
                            {fmt(p.amount, campaign.currency)}
                            {p.message ? ` — "${p.message}"` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Close campaign */}
            {isOwnerOrAdmin && campaign.status === "active" && (
              <form action={closeCampaign.bind(null, campaign.id, slug)} className="border-t border-muted-teal/20 pt-4">
                <button type="submit" className="text-xs text-dark-slate/40 hover:text-dark-slate underline">
                  {t("closeCampaignButton")}
                </button>
              </form>
            )}
          </div>

          {/* Backers list */}
          {confirmedPledges.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">
                {t("backersHeading")}
              </h3>
              <div className="divide-y divide-muted-teal/20 border border-muted-teal/30 rounded-lg overflow-hidden">
                {confirmedPledges.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    {/* Avatar initial */}
                    <div className="w-8 h-8 rounded-full bg-muted-teal/30 flex items-center justify-center text-xs font-semibold text-dark-slate/70 flex-shrink-0">
                      {(p.user.name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-slate">{p.user.name ?? t("anonymousBacker")}</p>
                      {p.rewardTier && (
                        <p className="text-xs text-seagrass">{p.rewardTier.title}</p>
                      )}
                      {p.message && (
                        <p className="text-xs text-dark-slate/50 mt-0.5 truncate">{p.message}</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-seagrass flex-shrink-0">
                      {fmt(p.amount, campaign.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Expenses (members only) */}
          {isMember && (
            <section>
              <h3 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">
                {t("expensesHeading")}
              </h3>

              {campaign.expenses.length === 0 ? (
                <p className="text-sm text-dark-slate/40">{t("noExpensesYet")}</p>
              ) : (
                <div className="divide-y divide-muted-teal/20 border border-muted-teal/30 rounded-lg overflow-hidden mb-4">
                  {campaign.expenses.map((exp) => (
                    <div key={exp.id} className="flex items-start justify-between gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark-slate">{exp.title}</p>
                        {exp.description && (
                          <p className="text-xs text-dark-slate/50 mt-0.5">{exp.description}</p>
                        )}
                        <p className="text-xs text-dark-slate/30 mt-0.5">
                          {new Date(exp.date).toLocaleDateString("sv-SE")}
                          {exp.milestone && (
                            <span className="ml-2 inline-block bg-dry-sage text-dark-slate/60 px-1.5 py-0.5 rounded">
                              {exp.milestone.title}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-dark-slate flex-shrink-0">
                        {fmt(exp.amount, campaign.currency)}
                      </span>
                    </div>
                  ))}
                  {/* Total */}
                  <div className="flex items-center justify-between px-4 py-3 bg-dry-sage/30">
                    <span className="text-xs font-semibold text-dark-slate/50 uppercase tracking-wider">{t("expensesTotal")}</span>
                    <span className="text-sm font-bold text-dark-slate">
                      {fmt(
                        campaign.expenses.reduce((s, e) => s + e.amount, 0),
                        campaign.currency
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Add expense form (owner/admin only) */}
              {isOwnerOrAdmin && (
                <div className="border border-dashed border-muted-teal/40 rounded-lg p-4">
                  <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">
                    {t("addExpenseHeading")}
                  </p>
                  <form action={addExpense.bind(null, campaign.id, slug)} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <input
                          name="title"
                          required
                          placeholder={t("expenseTitlePlaceholder")}
                          className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                        />
                      </div>
                      <div>
                        <input
                          name="amount"
                          type="number"
                          min="1"
                          required
                          placeholder={t("amountPlaceholder", { currency: campaign.currency })}
                          className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                        />
                      </div>
                      <div>
                        <input
                          name="description"
                          placeholder={t("expenseNotePlaceholder")}
                          className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          name="milestoneId"
                          defaultValue=""
                          className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass bg-white"
                        >
                          <option value="">{t("noMilestoneOption")}</option>
                          {project.milestones.map((m) => (
                            <option key={m.id} value={m.id}>{m.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="text-sm font-medium text-seagrass hover:text-dark-slate border border-seagrass/40 hover:border-dark-slate/40 px-3 py-1.5 rounded-md transition-colors"
                    >
                      {t("addExpenseButton")}
                    </button>
                  </form>
                </div>
              )}

              {isOwnerOrAdmin && (
                <a
                  href={`/api/projects/${slug}/funding/export`}
                  className="inline-block mt-3 text-xs font-medium text-dark-slate/50 hover:text-dark-slate underline"
                >
                  {t("exportReportLink")}
                </a>
              )}
            </section>
          )}
        </div>

        {/* RIGHT: reward tiers sidebar */}
        {campaign.campaignType === "reward" && campaign.rewardTiers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest">
              {t("rewardTiersHeading")}
            </h3>
            {campaign.rewardTiers.map((tier) => {
              const backerCount = tier._count.pledges;
              const isFull = tier.maxBackers !== null && backerCount >= tier.maxBackers;
              return (
                <div
                  key={tier.id}
                  className={[
                    "border rounded-xl p-4 space-y-2",
                    isFull
                      ? "border-muted-teal/20 opacity-60"
                      : "border-muted-teal/40 hover:border-seagrass/50 transition-colors",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-dark-slate">{tier.title}</p>
                    <span className="text-sm font-bold text-seagrass whitespace-nowrap">
                      {fmt(tier.minAmount, campaign.currency)}+
                    </span>
                  </div>
                  {tier.description && (
                    <p className="text-xs text-dark-slate/55 leading-relaxed">{tier.description}</p>
                  )}
                  {tier.maxBackers !== null && (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-dry-sage rounded-full overflow-hidden">
                        <div
                          className="h-full bg-seagrass rounded-full"
                          style={{ width: `${Math.min(100, (backerCount / tier.maxBackers) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-dark-slate/40">
                        {t("tierBackersCount", { count: backerCount, max: tier.maxBackers })}
                        {isFull && ` ${t("tierFullSuffix")}`}
                      </p>
                    </div>
                  )}
                  {!isFull && campaign.status === "active" && userId && (
                    <p className="text-xs text-seagrass font-medium">{t("selectInFormBelow")}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
