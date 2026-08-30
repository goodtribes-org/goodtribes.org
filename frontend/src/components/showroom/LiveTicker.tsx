import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { showroomMonoFont, homeSansFont } from "@/lib/fonts";

// A continuously scrolling ticker (CSS-only marquee) rather than a
// swap-every-few-seconds line, so all recent activity is visible in one
// pass instead of only ever showing one item at a time.
export default async function LiveTicker({ items, locale }: { items: string[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Showroom.liveRow" });

  if (items.length === 0) return null;

  const track = [...items, ...items];

  return (
    <div
      className={`${homeSansFont.className} w-full`}
      style={{
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        width: "100vw",
        background: "#fafaf8",
        borderTop: "1px solid rgba(178,176,155,.35)",
        borderBottom: "1px solid rgba(178,176,155,.35)",
      }}
    >
      <style>{`
        @keyframes home-live-ticker-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .home-live-ticker-track { animation: home-live-ticker-scroll 40s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .home-live-ticker-track { animation: none; } }
      `}</style>
      <div className="max-w-[1160px] mx-auto px-8 flex items-center gap-3.5" style={{ padding: "13px 32px" }}>
        <span className="inline-block rounded-full bg-seagrass flex-shrink-0" style={{ width: 9, height: 9 }} />
        <span className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)", flexShrink: 0 }}>
          {t("label").toUpperCase()}
        </span>
        <div
          className="flex-1 overflow-hidden"
          style={{
            maskImage: "linear-gradient(90deg, transparent, #000 24px, #000 calc(100% - 24px), transparent)",
            WebkitMaskImage: "linear-gradient(90deg, transparent, #000 24px, #000 calc(100% - 24px), transparent)",
          }}
        >
          <div className="home-live-ticker-track inline-flex whitespace-nowrap text-dark-slate/80" style={{ fontSize: 14.5 }}>
            {track.map((item, i) => (
              <span key={i}>
                {item}
                <span className="text-dark-slate/25" style={{ margin: "0 22px" }}>•</span>
              </span>
            ))}
          </div>
        </div>
        <a href="#showroom-flode" className="text-coral ml-auto flex-shrink-0 hover:underline" style={{ fontSize: 13.5 }}>
          {t("allLink")}
        </a>
      </div>
    </div>
  );
}
