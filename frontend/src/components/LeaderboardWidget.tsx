import Link from "next/link";

type LeaderboardEntry = {
  id: string;
  name: string;
  image: string | null;
  tokens: number;
};

export default function LeaderboardWidget({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <section className="border border-muted-teal/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-dark-slate">Topplista</h2>
        <Link href="/members" className="text-xs text-seagrass hover:underline">
          Alla medlemmar →
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="text-dark-slate/40 text-xs text-center py-4">Ingen aktivitet ännu.</p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry, i) => {
            const initials = entry.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <li key={entry.id}>
                <Link
                  href={`/members/${entry.id}`}
                  className="flex items-center gap-3 hover:bg-dry-sage/20 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors"
                >
                  <span className="w-5 text-center text-xs font-bold text-dark-slate/40">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-dry-sage flex-shrink-0 flex items-center justify-center text-xs font-semibold text-dark-slate overflow-hidden">
                    {entry.image ? (
                      <img src={entry.image} alt={entry.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <span className="flex-1 min-w-0 text-sm text-dark-slate truncate">{entry.name}</span>
                  <span className="text-xs font-semibold text-coral">{Math.round(entry.tokens)} p</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
