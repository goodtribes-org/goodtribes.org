"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { homeSansFont, showroomMonoFont } from "@/lib/fonts";

// Five steps (Dröm/Utforska/Skapa/Förändra/En bättre värld — 2026-08
// homepage redesign). Ball colors and the dashed line between them keep the
// same gul-till-röd gradient as before. Each photo is picked to actually
// match its step's theme (checked by looking at each image, not just its
// filename): do-you-have-a-dream = the floating dream-balloon illustration
// (Dröm); Slide2 = stuck-at-a-desk-dreaming-of-more (Utforska, i.e. looking
// beyond where you are now); what-is-goodtribes = the dream-factory/team
// building scene (Skapa); want-a-change = breaking away from the crowd
// toward a new path (Förändra); want-to-be-a-winner = the full Leva/Må/Göra
// Gott pyramid climb (En bättre värld).
const STEPS = [
  { img: "do-you-have-a-dream.png", ball: "#ffb800" },
  { img: "Slide2.png", ball: "#ff9700" },
  { img: "what-is-goodtribes.png", ball: "#ff8700" },
  { img: "want-a-change.png", ball: "#ff7600" },
  { img: "want-to-be-a-winner.png", ball: "var(--color-coral)" },
] as const;

const LINE_SEGMENT_COLORS = ["#ffcc00", "#e86903", "#dd3704", "#d10505"];

export default function StepsCarousel() {
  const t = useTranslations("Showroom.stepsCarousel");
  const [active, setActive] = useState(0);
  const step = STEPS[active];
  const goPrev = () => setActive((i) => (i - 1 + STEPS.length) % STEPS.length);
  const goNext = () => setActive((i) => (i + 1) % STEPS.length);

  return (
    <div
      className={`${homeSansFont.className} w-full`}
      style={{
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        width: "100vw",
        borderTop: "1px solid rgba(178,176,155,.35)",
        borderBottom: "1px solid rgba(178,176,155,.35)",
      }}
    >
      <div className="max-w-[1160px] mx-auto px-8" style={{ padding: "72px 32px" }}>
        <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "rgba(37,68,65,.45)" }}>
          {t("eyebrow").toUpperCase()}
        </p>
        <h2 className="text-dark-slate" style={{ fontWeight: 600, letterSpacing: "-.01em", fontSize: "clamp(28px,3vw,36px)", marginBottom: 32 }}>
          {t("heading")}
        </h2>

        <div className="relative mx-auto" style={{ maxWidth: 820, marginBottom: 28 }}>
          <div
            className="hidden sm:flex absolute"
            style={{ top: 32, left: `${100 / (2 * STEPS.length)}%`, right: `${100 / (2 * STEPS.length)}%` }}
            aria-hidden="true"
          >
            {LINE_SEGMENT_COLORS.map((color, i) => (
              <div key={i} className="flex-1 border-t-2 border-dashed" style={{ borderColor: color }} />
            ))}
          </div>
          <div className="relative grid" style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}>
            {STEPS.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className="flex flex-col items-center"
                style={{ gap: 6 }}
              >
                <span
                  className="font-bold"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    color: "#fff",
                    background: s.ball,
                    boxShadow: i === active ? "0 0 0 3px #fff, 0 0 0 4.5px " + s.ball : "none",
                    transition: "background .15s, box-shadow .15s",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    fontSize: 11.5,
                    whiteSpace: "nowrap",
                    color: i === active ? "#254441" : "rgba(37,68,65,.55)",
                    fontWeight: i === active ? 500 : 400,
                  }}
                >
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
            className="hidden sm:flex items-center justify-center flex-shrink-0"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#fff",
              border: "1px solid rgba(37,68,65,.25)",
              color: "#254441",
              fontSize: 18,
            }}
          >
            ‹
          </button>
          <div className="bg-white border border-muted-teal/40 grid flex-1 overflow-hidden" style={{ borderRadius: 26, gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ position: "relative", aspectRatio: "16/10" }}>
              <img src={`/img/${step.img}`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ padding: "36px 40px 36px 32px", minWidth: 0 }}>
              <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)" }}>
                {t(`step${active}Label`).toUpperCase()}
              </p>
              <h3 className="text-dark-slate" style={{ fontWeight: 600, fontSize: "clamp(20px,2.2vw,26px)", lineHeight: 1.2, letterSpacing: "-.01em", marginTop: 8 }}>
                {t(`step${active}Title`)}
              </h3>
              <p className="text-dark-slate/70" style={{ fontSize: 15, lineHeight: 1.6, marginTop: 10 }}>
                {t(`step${active}Body`)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={goNext}
            aria-label={t("next")}
            className="hidden sm:flex items-center justify-center flex-shrink-0"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#fff",
              border: "1px solid rgba(37,68,65,.25)",
              color: "#254441",
              fontSize: 18,
            }}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
