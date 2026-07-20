export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCouncilMember } from "@/lib/authz";
import { getGtBalance } from "@/lib/tokens";
import CouncilVoteForm from "./CouncilVoteForm";
import SelfNominateButton from "./SelfNominateButton";

export const metadata: Metadata = {
  title: "Granskningsrådet — GoodTribes.org",
  description: "Communityns valda organ för att hantera regelbrott och etisk granskning.",
};

export default async function CouncilPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [activeMembers, openPoll, onCouncil] = await Promise.all([
    prisma.reviewCouncilMember.findMany({
      where: { termEnd: { gt: new Date() } },
      include: { user: { select: { name: true, image: true } } },
      orderBy: { termEnd: "asc" },
    }),
    prisma.platformPoll.findFirst({
      where: { type: "council_election", status: "open" },
      include: { options: { include: { candidate: { select: { id: true, name: true } } } } },
    }),
    userId ? isCouncilMember(userId) : Promise.resolve(false),
  ]);

  const alreadyNominated = openPoll?.options.some((o) => o.candidateId === userId) ?? false;

  let gtBalance = 0;
  let existingVotes: { optionId: string; weight: number }[] = [];
  if (userId && openPoll) {
    [gtBalance, existingVotes] = await Promise.all([
      getGtBalance(userId).then((b) => Math.max(b, 1)),
      prisma.platformPollVote.findMany({
        where: { pollId: openPoll.id, userId },
        select: { pollOptionId: true, gtWeight: true },
      }).then((rows) => rows.map((r) => ({ optionId: r.pollOptionId, weight: r.gtWeight }))),
    ]);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">Granskningsrådet</h1>
        <p className="text-sm text-dark-slate/50 mt-1">
          Communityns GT-valda organ för att hantera anmälningar om regelbrott och etisk granskning av flaggade
          projekt (PRD 5.53).
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          Nuvarande ledamöter ({activeMembers.length})
        </h2>
        {activeMembers.length === 0 ? (
          <p className="text-sm text-dark-slate/40">Inga aktiva ledamöter just nu.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {activeMembers.map((m) => (
              <li key={m.id} className="border border-muted-teal/40 rounded-lg px-3 py-2 text-sm bg-white">
                <p className="font-medium text-dark-slate">{m.user.name ?? "Okänd"}</p>
                <p className="text-xs text-dark-slate/40">Mandat till {m.termEnd.toLocaleDateString("sv-SE")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {onCouncil && (
        <div className="mb-8 border border-seagrass/30 bg-seagrass/5 rounded-lg p-4 text-sm">
          Du är ledamot i Granskningsrådet.{" "}
          <Link href="/granskningsradet/arenden" className="text-seagrass hover:underline font-medium">
            Se öppna ärenden →
          </Link>
          {" · "}
          <Link href="/granskningsradet/etik" className="text-seagrass hover:underline font-medium">
            Etikgranskning →
          </Link>
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">Val</h2>
        {!openPoll ? (
          <p className="text-sm text-dark-slate/40">Inget val pågår just nu.</p>
        ) : !userId ? (
          <p className="text-sm text-dark-slate/40">
            <Link href="/login" className="text-coral hover:underline">Logga in</Link> för att nominera dig eller rösta.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-semibold text-dark-slate mb-1">{openPoll.title}</h3>
              {openPoll.description && <p className="text-sm text-dark-slate/60 mb-2">{openPoll.description}</p>}
              {!alreadyNominated && <SelfNominateButton pollId={openPoll.id} />}
            </div>
            <CouncilVoteForm
              pollId={openPoll.id}
              candidates={openPoll.options
                .filter((o) => !!o.candidateId)
                .map((o) => ({ optionId: o.id, candidateId: o.candidateId!, label: o.label }))}
              gtBalance={gtBalance}
              existingVotes={existingVotes}
            />
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">Anmäl en användare</h2>
        <p className="text-sm text-dark-slate/60 mb-3">
          Om du upplever grov misskötsel eller regelbrott från en annan användare kan du anmäla det till rådet.
        </p>
        <Link
          href="/granskningsradet/anmal"
          className="inline-block px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors"
        >
          Anmäl en användare
        </Link>
      </section>
    </div>
  );
}
