export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import type { Metadata } from "next";
import { createCampaign, pledge, closeCampaign } from "./actions";

const prisma = new PrismaClient();

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Funding — GoodTribes.org` };
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default async function FundingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      members: { where: userId ? { userId } : { role: "owner" } },
      fundingCampaign: { include: { pledges: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } } } },
    },
  });
  if (!project) notFound();

  const myRole = project.members[0]?.role ?? null;
  const isOwnerOrAdmin = myRole === "owner" || myRole === "admin";
  const campaign = project.fundingCampaign;

  const raised = campaign?.pledges.reduce((s, p) => s + p.amount, 0) ?? 0;
  const pct = campaign ? Math.min(100, Math.round((raised / campaign.goal) * 100)) : 0;
  const myPledge = campaign?.pledges.find((p) => p.userId === userId);

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-xl font-bold text-dark-slate">Funding</h1>

      {!campaign ? (
        isOwnerOrAdmin ? (
          <div className="border border-dashed border-muted-teal/50 rounded-xl p-8">
            <h2 className="font-semibold text-dark-slate mb-1">Start a funding campaign</h2>
            <p className="text-sm text-dark-slate/50 mb-6">
              Set a goal and collect pledges from supporters. Payment processing is added later — for now this records interest.
            </p>
            <form action={createCampaign.bind(null, project.id, slug)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-dark-slate/60 mb-1">Campaign title</label>
                <input name="title" required className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass" placeholder="e.g. Fund our first prototype" />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-slate/60 mb-1">Goal (SEK)</label>
                <input name="goal" type="number" min="1" required className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass" placeholder="50000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-slate/60 mb-1">Description (optional)</label>
                <textarea name="description" rows={3} className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass resize-none" placeholder="What will the funds be used for?" />
              </div>
              <button type="submit" className="bg-coral text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-watermelon transition-colors">
                Start campaign
              </button>
            </form>
          </div>
        ) : (
          <p className="text-dark-slate/40 text-sm">No funding campaign has been started for this project yet.</p>
        )
      ) : (
        <div className="space-y-6">
          {/* Campaign header */}
          <div className="border border-muted-teal/40 rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-dark-slate text-lg">{campaign.title}</h2>
                {campaign.description && (
                  <p className="text-sm text-dark-slate/60 mt-1">{campaign.description}</p>
                )}
              </div>
              {campaign.status === "closed" && (
                <span className="text-xs bg-dry-sage text-dark-slate/60 px-2 py-1 rounded flex-shrink-0">Closed</span>
              )}
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-xs text-dark-slate/50 mb-1">
                <span>{fmt(raised, campaign.currency)} raised</span>
                <span>Goal: {fmt(campaign.goal, campaign.currency)}</span>
              </div>
              <div className="h-3 bg-dry-sage rounded-full overflow-hidden">
                <div className="h-full bg-seagrass rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-dark-slate/40 mt-1">{pct}% funded · {campaign.pledges.length} supporter{campaign.pledges.length !== 1 ? "s" : ""}</p>
            </div>

            {/* Pledge form */}
            {campaign.status === "active" && userId && (
              <form action={pledge.bind(null, campaign.id, slug)} className="border-t border-muted-teal/20 pt-4 space-y-3">
                <p className="text-sm font-medium text-dark-slate">
                  {myPledge ? `Your pledge: ${fmt(myPledge.amount, campaign.currency)} — update it below` : "Pledge your support"}
                </p>
                <div className="flex gap-2">
                  <input
                    name="amount"
                    type="number"
                    min="1"
                    defaultValue={myPledge?.amount ?? ""}
                    placeholder="Amount (SEK)"
                    required
                    className="flex-1 border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
                  />
                  <button type="submit" className="bg-seagrass text-white text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity whitespace-nowrap">
                    {myPledge ? "Update pledge" : "Pledge"}
                  </button>
                </div>
                <input name="message" className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass" placeholder="Message (optional)" defaultValue={myPledge?.message ?? ""} />
              </form>
            )}

            {campaign.status === "active" && !userId && (
              <p className="text-sm text-dark-slate/50 border-t border-muted-teal/20 pt-4">
                <a href="/login" className="text-coral hover:underline">Log in</a> to pledge support.
              </p>
            )}

            {isOwnerOrAdmin && campaign.status === "active" && (
              <form action={closeCampaign.bind(null, campaign.id, slug)} className="border-t border-muted-teal/20 pt-4">
                <button type="submit" className="text-xs text-dark-slate/40 hover:text-dark-slate underline">
                  Close campaign
                </button>
              </form>
            )}
          </div>

          {/* Supporter list */}
          {campaign.pledges.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">Supporters</h3>
              <div className="divide-y divide-muted-teal/20 border border-muted-teal/30 rounded-lg overflow-hidden">
                {campaign.pledges.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-dark-slate">{p.user.name ?? "Anonymous"}</p>
                      {p.message && <p className="text-xs text-dark-slate/50 mt-0.5">{p.message}</p>}
                    </div>
                    <span className="text-sm font-semibold text-seagrass">{fmt(p.amount, campaign.currency)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
