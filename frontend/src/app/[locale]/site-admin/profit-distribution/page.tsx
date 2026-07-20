import { prisma } from "@/lib/prisma";
import { proposeProfitDistribution, executeProfitDistribution, vetoProfitDistribution } from "./actions";

export default async function ProfitDistributionAdminPage() {
  const pendingRequests = await prisma.profitDistributionProposal.findMany({
    where: { status: "approved_by_members" },
    orderBy: { createdAt: "asc" },
    include: { project: { select: { title: true, slug: true } } },
  });

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">Vinstfördelning</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Styrelsens förslag om fördelning av kommersiella projekts vinst (PRD 4a). Ett godkänt röstresultat är en
          begäran — inte en automatisk utbetalning.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          Väntar på Stiftelsens beslut ({pendingRequests.length})
        </h2>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-dark-slate/40">Inga väntande förslag.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingRequests.map((r) => (
              <div key={r.id} className="border border-muted-teal/40 rounded-lg p-5 bg-white">
                <p className="font-semibold text-dark-slate">{r.project.title}</p>
                <p className="text-sm text-dark-slate/60 mb-3">
                  Reviderad vinst: {r.auditedProfitSek.toLocaleString("sv-SE")} kr — {r.proposedOperationsPct}% drift,{" "}
                  {r.proposedImpactFundPct}% Impact-fond, {100 - r.proposedOperationsPct - r.proposedImpactFundPct}%
                  till bidragsgivare
                </p>

                <form
                  action={async () => {
                    "use server";
                    await executeProfitDistribution(r.id);
                  }}
                  className="flex flex-wrap items-end gap-2 mb-2"
                >
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-coral text-white text-xs font-medium hover:bg-watermelon transition-colors"
                  >
                    Genomför fördelning
                  </button>
                </form>

                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await vetoProfitDistribution(r.id, (formData.get("note") as string) ?? "");
                  }}
                  className="flex flex-wrap items-end gap-2"
                >
                  <input
                    name="note"
                    type="text"
                    placeholder="Motivering för veto…"
                    className="flex-1 min-w-40 border border-muted-teal rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                  >
                    Använd veto
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          Föreslå ny vinstfördelning
        </h2>
        <p className="text-xs text-dark-slate/50 mb-3">
          Endast för kommersiella projekt (Kommersiellt — paraply-AB eller eget helägt AB).
        </p>
        <form action={proposeProfitDistribution} className="flex flex-wrap gap-2">
          <input
            name="projectSlug"
            type="text"
            placeholder="Projektets slug"
            className="border border-muted-teal rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <input
            name="auditedProfitSek"
            type="number"
            min="0"
            placeholder="Reviderad vinst (kr)"
            className="border border-muted-teal rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <input
            name="operationsPct"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="% drift"
            className="border border-muted-teal rounded px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <input
            name="impactFundPct"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="% Impact-fond"
            className="border border-muted-teal rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded border border-muted-teal/50 text-xs font-medium text-dark-slate/70 hover:border-dark-slate/40 hover:text-dark-slate transition-colors"
          >
            Skapa förslag
          </button>
        </form>
      </section>
    </div>
  );
}
