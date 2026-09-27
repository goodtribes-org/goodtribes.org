"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { newHomeDisplayFont } from "./fonts";

// Same 5 steps/photos as the plain HomePage's StepsCarousel
// (@/components/showroom/StepsCarousel) and the same Showroom.stepsCarousel
// translations — restyled to match this page's own card/eyebrow language
// (see PhaseJourney/FoundingCard/ToolsRow in Sections.tsx) instead of the
// showroom's mono-font, full-bleed look. Kept as its own file (not added to
// Sections.tsx) because it needs client-side state for the active step,
// and Sections.tsx's other exports pull in next-intl/server, which can't be
// bundled into a "use client" component.
const INK = "#1B1F1D";
const MUTED = "#4A514D";
const SUBTLE = "#6B726E";
const LINK = "#C2410C";

// Same warm-to-green scale as PhaseJourney's phase bars, just the first 5.
const STEPS = [
  { img: "do-you-have-a-dream.png", ball: "#F5B82E" },
  { img: "Slide2.png", ball: "#F29A2A" },
  { img: "what-is-goodtribes.png", ball: "#EE7A26" },
  { img: "want-a-change.png", ball: "#E8531F" },
  { img: "want-to-be-a-winner.png", ball: "#1FA37A" },
] as const;

export default function StepsSection() {
  const t = useTranslations("Showroom.stepsCarousel");
  const [active, setActive] = useState(0);
  const step = STEPS[active];
  const goPrev = () => setActive((i) => (i - 1 + STEPS.length) % STEPS.length);
  const goNext = () => setActive((i) => (i + 1) % STEPS.length);

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-9 px-4 pt-[72px] sm:px-8 lg:px-16">
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm font-bold uppercase tracking-[.12em]" style={{ color: LINK }}>{t("eyebrow")}</p>
        <h2
          className={`${newHomeDisplayFont.className} m-0 max-w-[720px] font-extrabold`}
          style={{ fontSize: "clamp(2rem, 4vw, 52px)", lineHeight: 1.05, letterSpacing: "-0.03em", color: INK }}
        >
          {t("heading")}
        </h2>
      </div>

      <div className="rounded-[32px] border border-[#E4E4DF] bg-white p-6 sm:p-10 lg:p-14">
        <div className="relative mx-auto mb-10 max-w-[820px]">
          <div
            className="absolute top-8 hidden sm:flex"
            style={{ left: `${100 / (2 * STEPS.length)}%`, right: `${100 / (2 * STEPS.length)}%` }}
            aria-hidden
          >
            {STEPS.slice(0, -1).map((s, i) => (
              <div key={i} className="flex-1 border-t-2 border-dashed" style={{ borderColor: s.ball }} />
            ))}
          </div>
          <div className="relative grid" style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}>
            {STEPS.map((s, i) => (
              <button key={i} type="button" onClick={() => setActive(i)} className="flex flex-col items-center gap-1.5 cursor-pointer">
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
                  style={{ background: s.ball, boxShadow: i === active ? `0 0 0 3px #fff, 0 0 0 4.5px ${s.ball}` : "none" }}
                >
                  {i + 1}
                </span>
                <span className="whitespace-nowrap text-[11.5px]" style={{ color: i === active ? INK : SUBTLE, fontWeight: i === active ? 600 : 400 }}>
                  {t(`step${i}Label`)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={goPrev}
            aria-label={t("prev")}
            className="hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#E4E4DF] bg-white text-lg sm:flex"
            style={{ color: INK }}
          >
            ‹
          </button>
          <div className="grid flex-1 overflow-hidden rounded-[20px] border border-[#E4E4DF] sm:grid-cols-2">
            <div className="relative aspect-[16/10]">
              <img src={`/img/${step.img}`} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <div className="min-w-0 p-8 sm:p-9">
              <p className="m-0 text-xs font-bold uppercase tracking-[.12em]" style={{ color: LINK }}>{t(`step${active}Label`)}</p>
              <h3
                className={`${newHomeDisplayFont.className} m-0 mt-2 font-extrabold`}
                style={{ fontSize: "clamp(1.25rem, 2.2vw, 26px)", lineHeight: 1.2, letterSpacing: "-0.01em", color: INK }}
              >
                {t(`step${active}Title`)}
              </h3>
              <p className="m-0 mt-2.5 text-[15px] leading-[1.6]" style={{ color: MUTED }}>{t(`step${active}Body`)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={goNext}
            aria-label={t("next")}
            className="hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#E4E4DF] bg-white text-lg sm:flex"
            style={{ color: INK }}
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
