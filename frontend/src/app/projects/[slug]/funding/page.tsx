export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import type { Metadata } from "next";
import { isStripeConfigured } from "@/lib/stripe";
import { createCampaign, pledge, closeCampaign, addExpense } from "./actions";
import PledgeForm from "./PledgeForm";

const prisma = new PrismaClient();

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Finansiering — GoodTribes.org` };
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function daysLeft(deadline: Date): number {
  const ms = deadline.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default async function FundingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      members: userId ? { where: { userId } } : { where: { role: "owner" } },
      fundingCampaign: {
        include: {
          pledges: {
            include: { user: { select: { name: true } }, rewardTier: { select: { id: true, title: true } } },
            orderBy: { createdAt: "desc" },
          },
          rewardTiers: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { pledges: true } } } },
          expenses: { orderBy: { date: "desc" } },
        },
      },
    },
  });
  if (!project) notFound();

  const myRole = project.members[0]?.role ?? null;
  const isOwnerOrAdmin = myRole === "owner" || myRole === "admin";
  const isMember = !!myRole;
  const campaign = project.fundingCampaign;
  const stripeReady = isStripeConfigured();

  const confirmedPledges = campaign?.pledges.filter((p) => p.pledgeStatus === "confirmed") ?? [];
  const raised = confirmedPledges.reduce((s, p) => s + p.amount, 0);
  const pct = campaign ? Math.min(100, Math.round((raised / campaign.goal) * 100)) : 0;
  const myPledge = campaign?.pledges.find((p) => p.userId === userId);

  const progressColor =
    pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-seagrass";

  // ── No campaign yet ──────────────────────────────────────────────────────────
  if (!campaign) {
    if (!isOwnerOrAdmin) {
      return (
        <div className="max-w-xl">
          <h1 className="text-xl font-bold text-dark-slate mb-4">Finansiering</h1>
          <p className="text-dark-slate/40 text-sm">
            Ingen finansieringskampanj har startats för det här projektet ännu.
          </p>
        </div>
      );
    }

    return (
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-dark-slate mb-6">Finansiering</h1>
        <div className="border border-dashed border-muted-teal/50 rounded-xl p-8">
          <h2 className="font-semibold text-dark-slate mb-1">Starta en kampanj</h2>
          <p className="text-sm text-dark-slate/50 mb-6">
            Sätt ett mål och samla in stöd från finansiärer.
          </p>
          <form action={createCampaign.bind(null, project.id, slug)} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">Kampanjnamn</label>
              <input
                name="title"
                required
                className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                placeholder="t.ex. Finansiera vår första prototyp"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">Beskrivning (valfritt)</label>
              <textarea
                name="description"
                rows={3}
                className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass resize-none"
                placeholder="Vad ska pengarna användas till?"
              />
            </div>

            {/* Goal + Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-slate/60 mb-1">Mål (belopp)</label>
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
                <label className="block text-xs font-medium text-dark-slate/60 mb-1">Valuta</label>
                <select
                  name="currency"
                  defaultValue="SEK"
                  className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass bg-white"
                >
                  <option value="SEK">SEK</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            {/* Type + Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-slate/60 mb-1">Kampanjtyp</label>
                <select
                  name="campaignType"
                  defaultValue="donation"
                  className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass bg-white"
                  id="campaignTypeSelect"
                >
                  <option value="donation">Donation</option>
                  <option value="reward">Belöningsnivåer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-slate/60 mb-1">Deadline (valfritt)</label>
                <input
                  name="deadline"
                  type="date"
                  className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                />
              </div>
            </div>

            {/* Platform fee (read-only) */}
            <div>
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">Plattformsavgift</label>
              <input type="hidden" name="platformFee" value="5" />
              <p className="text-sm text-dark-slate/50 border border-muted-teal/30 rounded-md px-3 py-2 bg-dry-sage/30">
                GoodTribes tar 5% — ändra i projektinställningar
              </p>
            </div>

            {/* Reward tiers (static form rows; JS-free server action approach) */}
            <div className="border border-muted-teal/30 rounded-lg p-4 space-y-4">
              <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest">
                Belöningsnivåer
              </p>
              <p className="text-xs text-dark-slate/40">
                Fylls i om kampanjtyp är "Belöningsnivåer". Lägg till upp till tre nivåer.
              </p>
              {[0, 1, 2].map((i) => (
                <div key={i} className="grid grid-cols-2 gap-3 border-t border-muted-teal/20 pt-4 first:border-t-0 first:pt-0">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-dark-slate/60 mb-1">Titel</label>
                    <input
                      name="tierTitle"
                      className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                      placeholder={`Nivå ${i + 1}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-slate/60 mb-1">Minimibelopp</label>
                    <input
                      name="tierMinAmount"
                      type="number"
                      min="1"
                      className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                      placeholder="500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-slate/60 mb-1">Max finansiärer (valfritt)</label>
                    <input
                      name="tierMaxBackers"
                      type="number"
                      min="1"
                      className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                      placeholder="obegränsat"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-dark-slate/60 mb-1">Beskrivning</label>
                    <input
                      name="tierDescription"
                      className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                      placeholder="Vad får finansiären?"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="bg-coral text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-watermelon transition-colors"
            >
              Starta kampanj
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Campaign exists ──────────────────────────────────────────────────────────
  const remaining = campaign.deadline ? daysLeft(campaign.deadline) : null;

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold text-dark-slate mb-6">Finansiering</h1>

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
                  {campaign.status === "active" ? "Aktiv" : "Avslutad"}
                </span>
                {campaign.deadline && (
                  <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">
                    {remaining === 0
                      ? "Sista dag"
                      : remaining === null
                      ? ""
                      : `${remaining} dag${remaining !== 1 ? "ar" : ""} kvar`}
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
                  <span className="font-semibold text-dark-slate text-sm">{fmt(raised, campaign.currency)}</span>{" "}
                  insamlat av {fmt(campaign.goal, campaign.currency)} ({pct}%)
                </span>
                <span>·</span>
                <span>
                  <span className="font-semibold text-dark-slate">{confirmedPledges.length}</span>{" "}
                  finansiär{confirmedPledges.length !== 1 ? "er" : ""}
                </span>
                {remaining !== null && (
                  <>
                    <span>·</span>
                    <span>
                      {campaign.status === "closed"
                        ? "Avslutad"
                        : remaining === 0
                        ? "Sista dag"
                        : `${remaining} dag${remaining !== 1 ? "ar" : ""} kvar`}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Pledge section */}
            {campaign.status === "active" && (
              <div className="border-t border-muted-teal/20 pt-5">
                {!userId ? (
                  <p className="text-sm text-dark-slate/50">
                    <a href="/login" className="text-coral hover:underline">Logga in</a> för att stödja kampanjen.
                  </p>
                ) : stripeReady ? (
                  <>
                    <p className="text-sm font-medium text-dark-slate mb-3">
                      {myPledge
                        ? `Du har bidragit med ${fmt(myPledge.amount, campaign.currency)}`
                        : "Stöd projektet"}
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
                      existingPledgeAmount={myPledge?.amount}
                    />
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      <span>Betalning ej konfigurerad — pledges är manuella</span>
                    </div>
                    <p className="text-sm font-medium text-dark-slate">
                      {myPledge
                        ? `Din pledge: ${fmt(myPledge.amount, campaign.currency)} — uppdatera nedan`
                        : "Pledga ditt stöd"}
                    </p>
                    <form action={pledge.bind(null, campaign.id, slug)} className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          name="amount"
                          type="number"
                          min="1"
                          defaultValue={myPledge?.amount ?? ""}
                          placeholder={`Belopp (${campaign.currency})`}
                          required
                          className="flex-1 border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                        />
                        <button
                          type="submit"
                          className="bg-seagrass text-white text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity whitespace-nowrap"
                        >
                          {myPledge ? "Uppdatera" : "Pledga"}
                        </button>
                      </div>
                      <input
                        name="message"
                        className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                        placeholder="Meddelande (valfritt)"
                        defaultValue={myPledge?.message ?? ""}
                      />
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* Close campaign */}
            {isOwnerOrAdmin && campaign.status === "active" && (
              <form action={closeCampaign.bind(null, campaign.id, slug)} className="border-t border-muted-teal/20 pt-4">
                <button type="submit" className="text-xs text-dark-slate/40 hover:text-dark-slate underline">
                  Avsluta kampanj
                </button>
              </form>
            )}
          </div>

          {/* Backers list */}
          {confirmedPledges.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">
                Finansiärer
              </h3>
              <div className="divide-y divide-muted-teal/20 border border-muted-teal/30 rounded-lg overflow-hidden">
                {confirmedPledges.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    {/* Avatar initial */}
                    <div className="w-8 h-8 rounded-full bg-muted-teal/30 flex items-center justify-center text-xs font-semibold text-dark-slate/70 flex-shrink-0">
                      {(p.user.name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-slate">{p.user.name ?? "Anonym"}</p>
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
                Hur medlen används
              </h3>

              {campaign.expenses.length === 0 ? (
                <p className="text-sm text-dark-slate/40">Inga utgifter registrerade ännu.</p>
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
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-dark-slate flex-shrink-0">
                        {fmt(exp.amount, campaign.currency)}
                      </span>
                    </div>
                  ))}
                  {/* Total */}
                  <div className="flex items-center justify-between px-4 py-3 bg-dry-sage/30">
                    <span className="text-xs font-semibold text-dark-slate/50 uppercase tracking-wider">Totalt</span>
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
                    Lägg till utgift
                  </p>
                  <form action={addExpense.bind(null, campaign.id, slug)} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <input
                          name="title"
                          required
                          placeholder="Titel, t.ex. Domänregistrering"
                          className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                        />
                      </div>
                      <div>
                        <input
                          name="amount"
                          type="number"
                          min="1"
                          required
                          placeholder={`Belopp (${campaign.currency})`}
                          className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                        />
                      </div>
                      <div>
                        <input
                          name="description"
                          placeholder="Notering (valfritt)"
                          className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="text-sm font-medium text-seagrass hover:text-dark-slate border border-seagrass/40 hover:border-dark-slate/40 px-3 py-1.5 rounded-md transition-colors"
                    >
                      + Lägg till utgift
                    </button>
                  </form>
                </div>
              )}
            </section>
          )}
        </div>

        {/* RIGHT: reward tiers sidebar */}
        {campaign.campaignType === "reward" && campaign.rewardTiers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest">
              Belöningsnivåer
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
                        {backerCount} / {tier.maxBackers} finansiärer
                        {isFull && " — full"}
                      </p>
                    </div>
                  )}
                  {!isFull && campaign.status === "active" && userId && (
                    <p className="text-xs text-seagrass font-medium">Välj i formuläret nedan</p>
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
