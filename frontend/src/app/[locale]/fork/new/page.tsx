import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { forkProject } from "../actions";

export default async function ForkNewPage({
  searchParams,
}: {
  searchParams: Promise<{ sourceType?: string; sourceId?: string }>;
}) {
  const { sourceType, sourceId } = await searchParams;
  if ((sourceType !== "project" && sourceType !== "sandboxRoom") || !sourceId) notFound();

  let sourceTitle: string;
  let contributors: { userId: string; name: string; weight: number; sharePercent: number }[] = [];

  if (sourceType === "project") {
    const source = await prisma.project.findUnique({ where: { slug: sourceId }, select: { title: true } });
    if (!source) notFound();
    sourceTitle = source.title;

    const holderTotals = await prisma.tokenLedger.groupBy({
      by: ["userId"],
      where: { projectSlug: sourceId },
      _sum: { tokens: true },
    });
    const withBalance = holderTotals
      .map((h) => ({ userId: h.userId, weight: h._sum.tokens ?? 0 }))
      .filter((c) => c.weight > 0);
    const totalWeight = withBalance.reduce((sum, c) => sum + c.weight, 0);
    const users = await prisma.user.findMany({
      where: { id: { in: withBalance.map((c) => c.userId) } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(users.map((u) => [u.id, u.name ?? "Okänd"]));
    contributors = withBalance.map((c) => ({
      userId: c.userId,
      name: nameMap[c.userId] ?? "Okänd",
      weight: c.weight,
      sharePercent: totalWeight > 0 ? (c.weight / totalWeight) * 100 : 0,
    }));
  } else {
    const room = await prisma.room.findUnique({ where: { id: sourceId }, select: { name: true, isSandbox: true } });
    if (!room || !room.isSandbox) notFound();
    sourceTitle = room.name ?? "Sandlådetråd";

    const authorCounts = await prisma.message.groupBy({
      by: ["authorId"],
      where: { roomId: sourceId, isAi: false },
      _count: { _all: true },
    });
    const users = await prisma.user.findMany({
      where: { id: { in: authorCounts.map((a) => a.authorId) } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(users.map((u) => [u.id, u.name ?? "Okänd"]));
    contributors = authorCounts.map((a) => ({
      userId: a.authorId,
      name: nameMap[a.authorId] ?? "Okänd",
      weight: a._count._all,
      sharePercent: 0,
    }));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-slate">Gaffla &quot;{sourceTitle}&quot;</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          En gaffling skapar ett nytt, fristående projekt utan tillstånd från originalet (PRD 4f). Det nya
          projektet startar alltid som ideellt (under Stiftelsens paraply) — ingen genväg runt den vanliga
          processen för att bli kommersiellt.
        </p>
      </div>

      <form action={forkProject.bind(null, sourceType, sourceId)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-dark-slate mb-1">Titel på det nya projektet</label>
          <input
            name="title"
            type="text"
            placeholder={`${sourceTitle} (fork)`}
            className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>

        {sourceType === "project" && contributors.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-2">
              Bidragsgivare i originalet
            </h2>
            <p className="text-xs text-dark-slate/50 mb-3">
              Om det nya projektet någon gång blir vinstdrivande får dessa personer automatiskt en andel av
              vinstdelningen, proportionellt mot sitt tokeninnehav i originalet — det är obligatoriskt. Att ge dem
              tokens (och därmed rösträtt) i det nya projektet redan nu är helt valfritt.
            </p>
            <div className="flex flex-col gap-2">
              {contributors.map((c) => (
                <div key={c.userId} className="flex items-center gap-3 border border-muted-teal rounded-lg px-4 py-3">
                  <div className="flex-1 min-w-0 text-sm">
                    <span className="font-medium text-dark-slate">{c.name}</span>
                    <span className="text-dark-slate/50 ml-2">{c.sharePercent.toFixed(1)}% vinstandel</span>
                  </div>
                  <input
                    name={`grant_${c.userId}`}
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Valfria tokens"
                    className="w-32 border border-muted-teal rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="bg-coral text-white text-sm font-medium px-5 py-2.5 rounded hover:bg-watermelon transition-colors"
        >
          Gaffla
        </button>
      </form>
    </div>
  );
}
