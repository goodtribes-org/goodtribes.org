import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { displaySerifFont, showroomMonoFont } from "@/lib/fonts";

const TIERS = [
  { key: 0, width: "100%", bg: "var(--color-seagrass)", clip: "polygon(0 100%,100% 100%,88% 0,12% 0)", img: "f_swim_t.png" },
  { key: 1, width: "84%", bg: "var(--color-dark-slate)", clip: "polygon(0 100%,100% 100%,86% 0,14% 0)", img: "f_green_t.png" },
  { key: 2, width: "70%", bg: "var(--color-watermelon)", clip: "polygon(0 100%,100% 100%,82% 0,18% 0)", img: "f_red_t.png" },
  { key: 3, width: "56%", bg: "var(--color-coral)", clip: "polygon(0 100%,100% 100%,74% 0,26% 0)", img: "f_orange_t.png" },
] as const;

export default async function GoodPyramid({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Showroom.pyramid" });
  const heroSrc = locale === "en" ? "/img/showroom/hero_wide_en.png" : "/img/showroom/hero_wide.png";

  return (
    <div
      className="w-full"
      style={{
        marginTop: 88,
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        width: "100vw",
        background: "rgba(9,120,9,.07)",
        borderTop: "1px solid rgba(178,176,155,.35)",
        borderBottom: "1px solid rgba(178,176,155,.35)",
      }}
    >
      <div className="max-w-[1160px] mx-auto px-8" style={{ padding: "80px 32px 0" }}>
        <p className={showroomMonoFont.className} style={{ fontSize: 11.5, letterSpacing: ".16em", color: "rgba(37,68,65,.45)" }}>
          {t("eyebrow").toUpperCase()}
        </p>
        <h2 className={`${displaySerifFont.className} text-dark-slate`} style={{ fontSize: "clamp(34px,3.4vw,46px)" }}>
          {t("heading")}
        </h2>
        <p className="text-dark-slate/70 mt-2 mb-9" style={{ fontSize: 17, lineHeight: 1.6, maxWidth: "50ch" }}>
          {t("intro")}
        </p>
      </div>

      <div className="w-full" style={{ background: "#88D5F5", marginBottom: 44 }}>
        <div className="max-w-[1160px] mx-auto">
          <img src={heroSrc} alt="" className="w-full" />
        </div>
      </div>

      <div className="max-w-[1160px] mx-auto px-8 flex flex-col-reverse gap-[18px] pb-16" style={{ maxWidth: 880 }}>
        {TIERS.map((tier) => (
          <div key={tier.key} className="flex flex-col items-center" style={{ gap: 8 }}>
            <div className="flex items-center justify-center" style={{ gap: 22, width: "100%" }}>
              <img
                src={`/img/showroom/${tier.img}`}
                alt=""
                className="rounded-full bg-white border border-muted-teal/40 flex-shrink-0"
                style={{ width: 86, height: 86, objectFit: "cover", objectPosition: "50% 22%" }}
              />
              <div
                className={`${displaySerifFont.className} flex items-center justify-center text-white`}
                style={{ width: tier.width, height: 74, clipPath: tier.clip, background: tier.bg, fontSize: 27 }}
              >
                {t(`tier${tier.key}Label`)}
              </div>
            </div>
            <p className="text-center text-dark-slate/70" style={{ width: tier.width, fontSize: 14.5, lineHeight: 1.55 }}>
              {t(`tier${tier.key}Body`)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
