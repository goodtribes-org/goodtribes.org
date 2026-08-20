"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { displaySerifFont, showroomMonoFont } from "@/lib/fonts";

// Fem steg (ursprungligen sex, slogs ihop till fyra: Hitta+Joina → Utforska,
// Lev gott+Alla vinner → Lev gott — sedan lades Genomslag till som ett nytt
// femte steg mellan Förändra och Lev gott). Bollfärgerna och den streckade
// linjen mellan dem återger samma gul-till-röd gradient som
// OnboardingStepsBar:s sex cirklar, nedsamplad till fem stopp. Bilderna är
// samma runda tonade bilder som redan fanns i sex-stegsversionen.
const STEPS = [
  { img: "f_green_t.png", tint: "rgba(9,120,9,.14)", ball: "#ffb800" },
  { img: "bulb_t.png", tint: "rgba(240,180,41,.16)", ball: "#ff9700" },
  { img: "f_cart_t.png", tint: "rgba(240,180,41,.14)", ball: "#ff8700" },
  { img: "f_orange_t.png", tint: "rgba(255,102,0,.12)", ball: "#ff7600" },
  { img: "f_swim_t.png", tint: "rgba(136,213,245,.4)", ball: "var(--color-coral)" },
] as const;

const LINE_SEGMENT_COLORS = ["#ffcc00", "#e86903", "#dd3704", "#d10505"];

export default function StepsCarousel() {
  const t = useTranslations("Showroom.stepsCarousel");
  const [active, setActive] = useState(0);
  const step = STEPS[active];

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
        <p className={`${showroomMonoFont.className} text-center`} style={{ fontSize: 11, letterSpacing: ".14em", color: "rgba(37,68,65,.45)" }}>
          {t("eyebrow").toUpperCase()}
        </p>
        <h2 className={`${displaySerifFont.className} text-dark-slate text-center`} style={{ fontSize: "clamp(30px,3vw,40px)", marginBottom: 32 }}>
          {t("heading")}
        </h2>

        <div className="relative flex justify-center" style={{ marginBottom: 28 }}>
          <div
            className="hidden sm:flex absolute"
            style={{ top: 32, left: "18%", right: "18%" }}
            aria-hidden="true"
          >
            {LINE_SEGMENT_COLORS.map((color, i) => (
              <div key={i} className="flex-1 border-t-2 border-dashed" style={{ borderColor: color }} />
            ))}
          </div>
          <div className="relative flex" style={{ gap: 48 }}>
            {STEPS.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className="flex flex-col items-center"
                style={{ gap: 6 }}
              >
                <span
                  className={`${displaySerifFont.className} font-bold`}
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
                    opacity: i === active ? 1 : 0.45,
                    boxShadow: i === active ? "0 0 0 3px #fff, 0 0 0 4.5px " + s.ball : "none",
                    transition: "opacity .15s, box-shadow .15s",
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

        <div className="bg-white border border-muted-teal/40 flex flex-wrap items-center gap-8" style={{ borderRadius: 26, padding: "clamp(26px,3vw,44px)" }}>
          <div
            className="rounded-full overflow-hidden flex-shrink-0"
            style={{ width: "clamp(120px,14vw,170px)", height: "clamp(120px,14vw,170px)", background: step.tint }}
          >
            <img src={`/img/showroom/${step.img}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 26%" }} />
          </div>
          <div style={{ flex: "1 1 320px" }}>
            <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)" }}>
              {t(`step${active}Label`).toUpperCase()}
            </p>
            <h3 className={`${displaySerifFont.className} text-dark-slate`} style={{ fontSize: "clamp(24px,2.6vw,32px)", lineHeight: 1.15, letterSpacing: "-.01em" }}>
              {t(`step${active}Title`)}
            </h3>
            <p className="text-dark-slate/70 mt-2" style={{ fontSize: 16, lineHeight: 1.65, maxWidth: "56ch" }}>
              {t(`step${active}Body`)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
