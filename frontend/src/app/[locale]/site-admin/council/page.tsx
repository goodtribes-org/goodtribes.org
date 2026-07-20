import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { createCouncilElection, closeCouncilElection } from "./actions";

export default async function CouncilAdminPage() {
  const [activeMembers, polls] = await Promise.all([
    prisma.reviewCouncilMember.findMany({
      where: { termEnd: { gt: new Date() } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { termEnd: "asc" },
    }),
    prisma.platformPoll.findMany({
      where: { type: "council_election" },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { options: true, votes: true } } },
    }),
  ]);

  const openPoll = polls.find((p) => p.status === "open");

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">Granskningsrådet</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Starta och avsluta val till Granskningsrådet (PRD 5.53). Rådets egna sidor finns på{" "}
          <Link href="/granskningsradet" className="text-coral hover:underline">/granskningsradet</Link>.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          Nuvarande ledamöter ({activeMembers.length})
        </h2>
        {activeMembers.length === 0 ? (
          <p className="text-sm text-dark-slate/40">Inga aktiva ledamöter.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {activeMembers.map((m) => (
              <li key={m.id} className="text-dark-slate/80">
                {m.user.name ?? m.user.email} — mandat till {m.termEnd.toLocaleDateString("sv-SE")}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">Starta nytt val</h2>
        {openPoll ? (
          <div className="border border-amber-300 bg-amber-50 rounded-lg p-4 text-sm text-amber-800 flex items-center justify-between gap-4">
            <span>Ett val ("{openPoll.title}") pågår redan — avsluta det innan ett nytt startas.</span>
            <form action={closeCouncilElection.bind(null, openPoll.id)}>
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-coral text-white text-xs font-medium hover:bg-watermelon transition-colors flex-shrink-0"
              >
                Avsluta val
              </button>
            </form>
          </div>
        ) : (
          <form action={createCouncilElection} className="flex flex-col gap-3 border border-muted-teal/30 rounded-lg p-4">
            <input
              name="title"
              type="text"
              defaultValue="Val till Granskningsrådet"
              className="border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
            <textarea
              name="description"
              rows={3}
              placeholder="Valfri beskrivning av valet…"
              className="border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
            />
            <label className="text-xs text-dark-slate/50">
              Deadline (valfritt)
              <input
                name="deadline"
                type="date"
                className="mt-1 block border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </label>
            <button
              type="submit"
              className="self-start bg-coral text-white text-sm font-medium px-4 py-2 rounded hover:bg-watermelon transition-colors"
            >
              Starta val
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">Tidigare val</h2>
        {polls.length === 0 ? (
          <p className="text-sm text-dark-slate/40">Inga val ännu.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {polls.map((p) => (
              <li key={p.id} className="flex items-center justify-between border border-muted-teal/30 rounded px-3 py-2">
                <span>{p.title}</span>
                <span className="text-xs text-dark-slate/50">
                  {p.status === "open" ? "Pågår" : "Avslutat"} · {p._count.options} kandidater · {p._count.votes} röster
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
