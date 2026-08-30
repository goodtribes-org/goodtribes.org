import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { homeSansFont, showroomMonoFont } from "@/lib/fonts";
import type { PlatformImpactStats } from "@/lib/platformStats";

const TILES = [
  { key: "raised", color: "coral", path: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /> },
  { key: "donated", color: "seagrass", path: <path d="M12 21s-7-4.35-9-9.5A5.5 5.5 0 0112 7a5.5 5.5 0 019 4.5c-2 5.15-9 9.5-9 9.5z" /> },
  { key: "tasksDone", color: "navy", path: <path d="M9 11l2 2 3-4M4 6h16M4 12h16M4 18h16" /> },
] as const;

const COLOR_HEX: Record<string, string> = {
  coral: "var(--color-coral)",
  seagrass: "var(--color-seagrass)",
  navy: "var(--color-navy)",
};

export default async function ImpactSnapshot({ locale, stats, copy }: { locale: Locale; stats: PlatformImpactStats; copy: Record<string, string> }) {
  const t = await getTranslations({ locale, namespace: "HomePage.impactSnapshot" });
  const c = (key: string) => copy[`HomePage.impactSnapshot.${key}`] ?? t(key);

  const sek = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);
  const count = (n: number) => new Intl.NumberFormat(locale).format(n);

  const values: Record<string, string> = {
    raised: sek(stats.totalRaisedSek),
    donated: sek(stats.totalDonatedSek),
    tasksDone: count(stats.tasksCompleted),
  };

  return (
    <div
      className={`${homeSansFont.className} w-full`}
      style={{ marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)", width: "100vw", background: "#fafaf8", borderTop: "1px solid rgba(178,176,155,.35)", borderBottom: "1px solid rgba(178,176,155,.35)" }}
    >
      <div className="max-w-[1160px] mx-auto px-8" style={{ padding: "44px 32px" }}>
        <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)" }}>
          {c("eyebrow").toUpperCase()}
        </p>
        <h2 className="text-dark-slate" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.01em", marginTop: 8, marginBottom: 28 }}>
          {c("heading")}
        </h2>

        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {TILES.map((tile) => (
            <div key={tile.key} className="flex items-center" style={{ gap: 14 }}>
              <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 44, height: 44, background: `color-mix(in oklab, ${COLOR_HEX[tile.color]} 14%, white)` }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLOR_HEX[tile.color]} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  {tile.path}
                </svg>
              </div>
              <div>
                <p className="text-dark-slate font-bold" style={{ fontSize: 22, letterSpacing: "-.01em" }}>{values[tile.key]}</p>
                <p className="text-dark-slate/55" style={{ fontSize: 12.5 }}>{c(`${tile.key}Label`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
