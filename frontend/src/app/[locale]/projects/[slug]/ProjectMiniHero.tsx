import Image from "next/image";
import { handwritingFontThin } from "@/lib/fonts";

// Reduced hero shown on workspace subpages (Uppgifter, Kalender, Verktyg-sidorna, ...) —
// an exact crop of the Startsidan hero: same 490px background (blur-2xl scale-110,
// centered — no object-top override) and the same photo-card markup positioned
// with the same px-4/pt-10 flow as Startsidan's Card 1, just clipped by this
// component's shorter, fixed height instead of re-derived offsets, so the two
// pages can't drift out of sync with each other.
export default function ProjectMiniHero({
  title,
  slogan,
  imageUrl,
  dateLabel,
}: {
  title: string;
  slogan: string | null;
  imageUrl: string | null;
  dateLabel: string;
}) {
  return (
    <div
      className="relative -mt-8 overflow-hidden border-b border-muted-teal/20"
      style={{ marginLeft: "calc(50% - 50vw)", width: "100vw", height: 105 }}
    >
      <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: 490 }}>
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill unoptimized className="object-cover blur-2xl scale-110" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-dark-slate to-dark-slate/70" />
        )}
      </div>
      {imageUrl && (
        <div className="relative z-10 px-4 pt-10 flex justify-center">
          <div
            className="shrink-0 bg-white w-full max-w-[660px] 2xl:max-w-[820px]"
            style={{
              // No overflow-hidden here — the image is already fully bounded by
              // its own div below, so this card doesn't need to clip anything
              // (it used to also clip Kalam's tall glyphs whenever they
              // rendered slightly outside leading-none's tight line box).
              // Bottom padding covers for the missing slogan line (40px line
              // height + 3px gap) when there is none, so the blank zone below
              // the image still matches the title's zone above it.
              padding: slogan ? "0px 24px 0px" : "0px 24px 43px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)", transform: "rotate(-3deg)", position: "relative",
            }}
          >
            {/* line-height is explicit (not leading-none) because `truncate`
                sets overflow-hidden on this element itself — Kalam's tall
                glyphs (ascenders here, descenders like "j" on the slogan below)
                need a line box big enough to actually contain them, or they
                clip regardless of the card's own overflow setting. 40px is the
                smallest that keeps the clip imperceptible — tested empirically. */}
            <p className={`${handwritingFontThin.className} text-center truncate px-2`} style={{ fontSize: 26, lineHeight: "40px", color: "#1a3d8f", transform: "translateY(2px)" }}>
              {title} - {dateLabel}
            </p>
            <div className="relative w-full h-64 sm:h-80 md:h-[400px] 2xl:h-[460px] mt-[3px]">
              <Image src={imageUrl} alt={title} fill unoptimized className="object-cover" />
            </div>
            {slogan && (
              <p className={`${handwritingFontThin.className} text-center truncate px-2 mt-[3px]`} style={{ fontSize: 26, lineHeight: "40px", color: "#1a3d8f" }}>
                &quot;{slogan}&quot;
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
