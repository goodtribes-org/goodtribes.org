export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `Token-fördelning — ${project.title} — GoodTribes.org` };
}

export default async function TokensPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, title: true },
  });
  if (!project) notFound();

  // Token leaderboard: group by userId for this project
  const ledgerEntries = await prisma.tokenLedger.findMany({
    where: { projectSlug: slug },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  const totalsMap = new Map<
    string,
    { userId: string; name: string | null; image: string | null; total: number }
  >();
  for (const entry of ledgerEntries) {
    const existing = totalsMap.get(entry.userId);
    if (existing) {
      existing.total += entry.tokens;
    } else {
      totalsMap.set(entry.userId, {
        userId: entry.userId,
        name: entry.user.name,
        image: entry.user.image,
        total: entry.tokens,
      });
    }
  }
  const leaderboard = Array.from(totalsMap.values()).sort((a, b) => b.total - a.total);

  return (
    <div className="max-w-3xl space-y-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-dark-slate/50">
        <Link href="/projects" className="hover:text-dark-slate transition-colors">
          Projects
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/projects/${slug}`} className="hover:text-dark-slate transition-colors">
          {project.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-dark-slate">Tribe Tokens</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-dark-slate">Tribe Tokens</h1>
        <p className="text-dark-slate/60 text-sm mt-1">
          Token-fördelning bland bidragsgivare i {project.title}
        </p>
      </div>

      {/* Leaderboard */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Token-fördelning</h2>
        {leaderboard.length === 0 ? (
          <div className="border border-dashed border-muted-teal rounded-lg p-10 text-center">
            <p className="text-dark-slate/50 text-sm">
              Inga tokens har delats ut ännu. Bocka av deluppgifter och flytta kort till Klart för att tjäna tokens.
            </p>
          </div>
        ) : (
          <div className="border border-muted-teal rounded-lg overflow-hidden divide-y divide-muted-teal/50">
            {leaderboard.map((entry, index) => {
              const rank = index + 1;
              const initials = (entry.name ?? "?")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <div
                  key={entry.userId}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  {/* Rank */}
                  <span className="w-7 text-center text-sm font-bold text-dark-slate/40 flex-shrink-0">
                    {rank === 1 ? (
                      <span title="Förstaplacerad">🥇</span>
                    ) : (
                      rank
                    )}
                  </span>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate flex-shrink-0 overflow-hidden">
                    {entry.image ? (
                      <img
                        src={entry.image}
                        alt={entry.name ?? ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  {/* Name */}
                  <span className="flex-1 text-sm font-medium text-dark-slate truncate">
                    {entry.name ?? "Okänd"}
                  </span>

                  {/* Tokens */}
                  <span className="text-sm font-bold text-seagrass flex-shrink-0">
                    {entry.total % 1 === 0
                      ? entry.total.toFixed(0)
                      : entry.total.toFixed(1)}{" "}
                    <span className="font-normal text-dark-slate/50">tokens</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
