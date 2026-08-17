"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { displaySerifFont, showroomBodyFont, showroomMonoFont } from "@/lib/fonts";

const CARD_KEYS = [
  { key: "Pengar", img: "f_cart_t.png" },
  { key: "Tribe", img: "f_red_t.png" },
  { key: "Byte", img: "f_green_t.png" },
  { key: "Guida", img: "f_blue_t.png" },
  { key: "Resurser", img: "f_swim_t.png" },
  { key: "Forma", img: "f_orange_t.png" },
] as const;

// next-intl's `t` isn't typed to a strict literal-key union in this project
// (no generated IntlMessages augmentation), so building keys dynamically per
// card (`card${key}Quote` etc.) is safe here.
export default function ShowroomGrid() {
  const t = useTranslations("Showroom.showroomSection");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = CARD_KEYS.find((c) => c.key === openKey);

  return (
    <div id="showroom" className="max-w-[1160px] mx-auto px-8" style={{ padding: "80px 32px 20px" }}>
      <div className="flex items-end gap-10 flex-wrap mb-10">
        <div>
          <p className={showroomMonoFont.className} style={{ fontSize: 11.5, letterSpacing: ".16em", color: "rgba(37,68,65,.45)" }}>
            {t("eyebrow").toUpperCase()}
          </p>
          <h2 className={`${displaySerifFont.className} text-dark-slate`} style={{ fontSize: "clamp(34px,3.4vw,46px)", lineHeight: 1.08, letterSpacing: "-.015em" }}>
            {t("heading")}
          </h2>
        </div>
        <p className={`${showroomBodyFont.className} text-dark-slate/70`} style={{ fontSize: 17, lineHeight: 1.6, maxWidth: "38ch" }}>
          {t("intro")}
        </p>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {CARD_KEYS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setOpenKey(c.key)}
            className="text-left bg-white border border-muted-teal/35 rounded-[22px] p-6 transition-colors hover:border-coral/60"
          >
            <div className="flex items-start gap-3.5 mb-4">
              <div className="flex items-end justify-center rounded-full overflow-hidden bg-seagrass/10 flex-shrink-0" style={{ width: 92, height: 92 }}>
                <img src={`/img/showroom/${c.img}`} alt="" style={{ width: "88%", height: "88%", objectFit: "contain", objectPosition: "bottom" }} />
              </div>
              <div className="bg-[#FBFAF6] border border-muted-teal/40 px-3.5 py-2.5" style={{ borderRadius: "16px 16px 16px 4px", fontSize: 13.5, lineHeight: 1.45, color: "rgba(37,68,65,.85)" }}>
                {t(`card${c.key}Quote`)}
              </div>
            </div>
            <h3 className={`${displaySerifFont.className} text-dark-slate`} style={{ fontSize: 26, lineHeight: 1.15 }}>
              {t(`card${c.key}Title`)}
            </h3>
            <p className="text-dark-slate/70 mt-2" style={{ fontSize: 15, lineHeight: 1.6 }}>
              {t(`card${c.key}Body`)}
            </p>
            <span className={`${showroomMonoFont.className} block mt-4 text-coral`} style={{ fontSize: 11.5, letterSpacing: ".1em" }}>
              {t("cardCta").toUpperCase()}
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center p-6 z-50"
          style={{ background: "rgba(37,68,65,.45)" }}
          onClick={() => setOpenKey(null)}
        >
          <div
            className="bg-[#FBFAF6] rounded-3xl w-full p-8 relative max-h-[85vh] overflow-y-auto"
            style={{ maxWidth: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpenKey(null)}
              aria-label={t("closeAria")}
              className="absolute top-4 right-4 rounded-full bg-white border border-dark-slate/20 flex items-center justify-center"
              style={{ width: 34, height: 34 }}
            >
              ✕
            </button>
            <div className="flex items-start gap-4 mb-4">
              <div className="flex items-end justify-center rounded-full overflow-hidden bg-seagrass/10 flex-shrink-0" style={{ width: 100, height: 100 }}>
                <img src={`/img/showroom/${open.img}`} alt="" style={{ width: "88%", height: "88%", objectFit: "contain", objectPosition: "bottom" }} />
              </div>
              <div className="bg-white border border-muted-teal/40 px-3.5 py-2.5" style={{ borderRadius: "16px 16px 16px 4px", fontSize: 13.5, lineHeight: 1.45, color: "rgba(37,68,65,.85)" }}>
                {t(`card${open.key}Quote`)}
              </div>
            </div>
            <h3 className={`${displaySerifFont.className} text-dark-slate mb-3`} style={{ fontSize: 32 }}>
              {t(`card${open.key}Title`)}
            </h3>
            <p className="text-dark-slate/80" style={{ fontSize: 16, lineHeight: 1.6 }}>
              {t(`card${open.key}Detail`)}
            </p>
            <div className="mt-4 bg-white border border-muted-teal/30 rounded-xl px-4 py-3" style={{ fontSize: 13.5, color: "rgba(37,68,65,.7)" }}>
              {t(`card${open.key}Example`)}
            </div>
            <button
              type="button"
              onClick={() => setOpenKey(null)}
              className="mt-5 inline-block rounded-full bg-coral text-white font-medium hover:bg-dark-slate transition-colors"
              style={{ padding: "12px 24px", fontSize: 15 }}
            >
              {t(`card${open.key}Cta`)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
