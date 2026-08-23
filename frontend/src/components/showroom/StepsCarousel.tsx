"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { homeSansFont, showroomMonoFont } from "@/lib/fonts";

// Five steps (Dröm/Utforska/Skapa/Förändra/En bättre värld — 2026-08
// homepage redesign). Ball colors and the dashed line between them keep the
// same gul-till-röd gradient as before; the photos are the same five real
// homepage images used pre-redesign (public/img/, not the showroom/ toned
// icon set), just reordered to match the new step narrative.
const STEPS = [
  { img: "Slide2.png", tint: "rgba(9,120,9,.14)", ball: "#ffb800" },
  { img: "want-a-change.png", tint: "rgba(240,180,41,.16)", ball: "#ff9700" },
  { img: "do-you-have-a-dream.png", tint: "rgba(240,180,41,.14)", ball: "#ff8700" },
  { img: "what-is-goodtribes.png", tint: "rgba(255,102,0,.12)", ball: "#ff7600" },
  { img: "want-to-be-a-winner.png", tint: "rgba(136,213,245,.4)", ball: "var(--color-coral)" },
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
      className="w-full"
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
        <h2 className={`${homeSansFont.className} text-dark-slate`} style={{ fontWeight: 600, letterSpacing: "-.01em", fontSize: "clamp(28px,3vw,36px)", marginBottom: 32 }}>
          {t("heading")}
        </h2>

        <div className="relative mx-auto" style={{ maxWidth: 820, marginBottom: 28 }}>
          {/* Linjen går mellan mittpunkten på boll 1 och mittpunkten på sista bollen
              (100% / (2 * antal steg) från varje kant) — kolumnerna nedan delar exakt
              samma bredd, så bollarna hamnar precis ovanpå linjens ändar och täcker dem
              (bollarna är solida, ingen opacity, så linjen aldrig lyser igenom). */}
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
                  className={`${homeSansFont.className} font-bold`}
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
          <div className="bg-white border border-muted-teal/40 flex flex-wrap items-center gap-8 flex-1" style={{ borderRadius: 26, padding: "clamp(26px,3vw,44px)" }}>
            <div
              className="rounded-full overflow-hidden flex-shrink-0"
              style={{ width: "clamp(120px,14vw,170px)", height: "clamp(120px,14vw,170px)", background: step.tint }}
            >
              <img src={`/img/${step.img}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 26%" }} />
            </div>
            <div style={{ flex: "1 1 320px" }}>
              <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)" }}>
                {t(`step${active}Label`).toUpperCase()}
              </p>
              <h3 className={`${homeSansFont.className} text-dark-slate`} style={{ fontWeight: 600, fontSize: "clamp(20px,2.2vw,26px)", lineHeight: 1.2, letterSpacing: "-.01em" }}>
                {t(`step${active}Title`)}
              </h3>
              <p className="text-dark-slate/70 mt-2" style={{ fontSize: 16, lineHeight: 1.65, maxWidth: "56ch" }}>
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
