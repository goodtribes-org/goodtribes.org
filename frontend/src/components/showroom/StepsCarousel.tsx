"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { displaySerifFont, showroomBodyFont, showroomMonoFont } from "@/lib/fonts";

const STEPS = [
  { img: "f_green_t.png", tint: "rgba(9,120,9,.14)" },
  { img: "f_red_t.png", tint: "rgba(209,5,5,.12)" },
  { img: "bulb_t.png", tint: "rgba(240,180,41,.16)" },
  { img: "f_cart_t.png", tint: "rgba(240,180,41,.14)" },
  { img: "f_swim_t.png", tint: "rgba(136,213,245,.4)" },
  { img: "f_orange_t.png", tint: "rgba(255,102,0,.12)" },
] as const;

export default function StepsCarousel() {
  const t = useTranslations("Showroom.stepsCarousel");
  const [slide, setSlide] = useState(0);
  const step = STEPS[slide];

  function go(i: number) {
    setSlide((i + STEPS.length) % STEPS.length);
  }

  return (
    <div
      className="w-full"
      style={{
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        width: "100vw",
        background: "rgba(9,120,9,.07)",
        borderTop: "1px solid rgba(178,176,155,.35)",
        borderBottom: "1px solid rgba(178,176,155,.35)",
      }}
    >
      <div className="max-w-[1160px] mx-auto px-8" style={{ padding: "72px 32px" }}>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "rgba(37,68,65,.45)" }}>
              {t("eyebrow").toUpperCase()}
            </p>
            <h2 className={`${displaySerifFont.className} text-dark-slate`} style={{ fontSize: "clamp(30px,3vw,40px)" }}>
              {t("heading")}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(slide - 1)}
              aria-label={t("prevAria")}
              className="rounded-full bg-white border border-dark-slate/20 text-dark-slate hover:border-seagrass hover:text-seagrass flex items-center justify-center"
              style={{ width: 44, height: 44, fontSize: 17 }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(slide + 1)}
              aria-label={t("nextAria")}
              className="rounded-full bg-white border border-dark-slate/20 text-dark-slate hover:border-seagrass hover:text-seagrass flex items-center justify-center"
              style={{ width: 44, height: 44, fontSize: 17 }}
            >
              ›
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide(i)}
              className={`${showroomMonoFont.className} rounded-full transition-colors`}
              style={{
                fontSize: 11,
                letterSpacing: ".12em",
                padding: "9px 15px",
                background: i === slide ? "var(--color-dark-slate)" : "#fff",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: i === slide ? "var(--color-dark-slate)" : "rgba(37,68,65,.2)",
                color: i === slide ? "#fff" : "rgba(37,68,65,.7)",
              }}
            >
              {i + 1} · {t(`step${i}Label`)}
            </button>
          ))}
        </div>

        <div className="bg-white border border-muted-teal/40 flex flex-wrap items-center gap-8" style={{ borderRadius: 26, padding: "clamp(26px,3vw,44px)" }}>
          <div
            className="rounded-full overflow-hidden flex-shrink-0"
            style={{ width: "clamp(150px,17vw,215px)", height: "clamp(150px,17vw,215px)", background: step.tint }}
          >
            <img src={`/img/showroom/${step.img}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 26%" }} />
          </div>
          <div style={{ flex: "1 1 320px" }}>
            <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)" }}>
              {t(`step${slide}Label`).toUpperCase()}
            </p>
            <h3 className={`${displaySerifFont.className} text-dark-slate`} style={{ fontSize: "clamp(28px,3vw,40px)", lineHeight: 1.12, letterSpacing: "-.015em" }}>
              {t(`step${slide}Title`)}
            </h3>
            <p className="text-dark-slate/70 mt-2" style={{ fontSize: 17, lineHeight: 1.65, maxWidth: "52ch" }}>
              {t(`step${slide}Body`)}
            </p>
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <span className={`${showroomBodyFont.className} inline-block rounded-full bg-dark-slate text-white font-medium`} style={{ padding: "12px 22px", fontSize: 15.5 }}>
                {t(`step${slide}Cta`)}
              </span>
              <span className={showroomMonoFont.className} style={{ fontSize: 11.5, color: "rgba(37,68,65,.45)" }}>
                {t("slideCounter", { current: slide + 1, total: STEPS.length })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
