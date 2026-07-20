import { prisma } from "@/lib/prisma";
import { getImpactFundBalance } from "@/lib/impactFund";
import { openAllocationRound, closeAllocationRound, executeAllocationRound } from "./actions";

function formatSek(amount: number) {
  return `${amount.toLocaleString("sv-SE")} kr`;
}

export default async function ImpactFundAdminPage() {
  const [balance, rounds] = await Promise.all([
    getImpactFundBalance(),
    prisma.impactFundAllocationRound.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        openedBy: { select: { name: true } },
      },
    }),
  ]);

  const activeRound = rounds.find((r) => r.status === "open" || r.status === "closed");
  const activePoll = activeRound
    ? await prisma.platformPoll.findUnique({
        where: { id: activeRound.pollId },
        include: { options: { include: { linkedProject: { select: { title: true, slug: true } } } } },
      })
    : null;

  let tallyByOption = new Map<string, number>();
  if (activeRound?.status === "closed" && activePoll) {
    const tally = await prisma.platformPollVote.groupBy({
      by: ["pollOptionId"],
      where: { pollId: activePoll.id },
      _sum: { gtWeight: true },
    });
    tallyByOption = new Map(tally.map((t) => [t.pollOptionId, t._sum.gtWeight ?? 0]));
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">Impact-fonden</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Fördela fondens saldo som uppstartskapital till nya projekt via en plattformsomfattande GT-röstning (PRD
          5.50.4).
        </p>
        <p className="text-sm text-dark-slate/80 mt-2 font-medium">Aktuellt saldo: {formatSek(balance)}</p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          {activeRound ? "Pågående omgång" : "Öppna ny omgång"}
        </h2>

        {!activeRound && (
          <form
            action={openAllocationRound}
            className="flex flex-col gap-3 border border-muted-teal/30 rounded-lg p-4"
          >
            <label className="text-xs text-dark-slate/50">
              Kandidatprojekt (slugs, ett per rad eller kommaseparerade)
              <textarea
                name="candidateSlugsRaw"
                rows={4}
                placeholder="mitt-projekt-1&#10;mitt-projekt-2"
                className="mt-1 block w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
              />
            </label>
            <button
              type="submit"
              className="self-start bg-coral text-white text-sm font-medium px-4 py-2 rounded hover:bg-watermelon transition-colors"
            >
              Öppna omgång
            </button>
          </form>
        )}

        {activeRound && activeRound.status === "open" && activePoll && (
          <div className="border border-amber-300 bg-amber-50 rounded-lg p-4">
            <p className="text-sm text-amber-800 mb-3">
              En omgång pågår med {activePoll.options.length} kandidatprojekt. Avsluta röstningen för att gå vidare
              till utbetalning.
            </p>
            <ul className="text-sm text-amber-900 mb-3 flex flex-col gap-1">
              {activePoll.options.map((o) => (
                <li key={o.id}>{o.linkedProject?.title ?? o.label}</li>
              ))}
            </ul>
            <form action={closeAllocationRound.bind(null, activePoll.id)}>
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-coral text-white text-xs font-medium hover:bg-watermelon transition-colors"
              >
                Avsluta omgång
              </button>
            </form>
          </div>
        )}

        {activeRound && activeRound.status === "closed" && activePoll && (
          <div className="border border-muted-teal/40 rounded-lg p-4">
            <p className="text-sm text-dark-slate/60 mb-3">
              Röstningen är avslutad. Rangordningen nedan är vägledande — ange belopp per projekt (max{" "}
              {formatSek(balance)} totalt).
            </p>
            <form action={executeAllocationRound.bind(null, activePoll.id)} className="flex flex-col gap-3">
              {[...activePoll.options]
                .sort((a, b) => (tallyByOption.get(b.id) ?? 0) - (tallyByOption.get(a.id) ?? 0))
                .map((o) => (
                  <div key={o.id} className="flex items-center gap-3 border border-muted-teal rounded-lg px-4 py-3">
                    <span className="flex-1 min-w-0 text-sm">
                      <span className="font-medium text-dark-slate">{o.linkedProject?.title ?? o.label}</span>
                      <span className="text-dark-slate/50 ml-2">{tallyByOption.get(o.id) ?? 0} GT</span>
                    </span>
                    <input
                      name={`amount_${o.id}`}
                      type="number"
                      min={0}
                      placeholder="kr"
                      className="w-28 border border-muted-teal rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-coral"
                    />
                  </div>
                ))}
              <button
                type="submit"
                className="self-start bg-coral text-white text-sm font-medium px-4 py-2 rounded hover:bg-watermelon transition-colors"
              >
                Genomför utbetalning
              </button>
            </form>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">Tidigare omgångar</h2>
        {rounds.length === 0 ? (
          <p className="text-sm text-dark-slate/40">Inga omgångar ännu.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {rounds.map((r) => (
              <li key={r.id} className="flex items-center justify-between border border-muted-teal/30 rounded px-3 py-2">
                <span>Öppnad av {r.openedBy.name ?? "Okänd"} — {r.createdAt.toLocaleDateString("sv-SE")}</span>
                <span className="text-xs text-dark-slate/50">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
