import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { displaySerifFont, showroomMonoFont } from "@/lib/fonts";

export default async function ThreeSteps({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Showroom.threeSteps" });
  const steps = [
    { n: "1", color: "var(--color-coral)", title: t("step1Title"), body: t("step1Body") },
    { n: "2", color: "var(--color-seagrass)", title: t("step2Title"), body: t("step2Body") },
    { n: "3", color: "var(--color-dark-slate)", title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <div className="max-w-[1160px] mx-auto px-8" style={{ padding: "76px 32px 8px" }}>
      <p className={showroomMonoFont.className} style={{ fontSize: 11.5, letterSpacing: ".16em", color: "rgba(37,68,65,.45)" }}>
        {t("eyebrow").toUpperCase()}
      </p>
      <h2 className={`${displaySerifFont.className} text-dark-slate`} style={{ fontSize: "clamp(34px,3.4vw,46px)" }}>
        {t("heading")}
      </h2>
      <p className="text-dark-slate/70 mt-2" style={{ fontSize: 17, lineHeight: 1.6, maxWidth: "52ch", marginBottom: 44 }}>
        {t("intro")}
      </p>
      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {steps.map((s) => (
          <div key={s.n} className="bg-white border border-muted-teal/35 flex flex-col" style={{ borderRadius: 22, padding: 26, gap: 14 }}>
            <span className={displaySerifFont.className} style={{ fontSize: 40, lineHeight: 1, color: s.color }}>
              {s.n}
            </span>
            <h3 className={displaySerifFont.className} style={{ fontSize: 24, color: "#254441" }}>
              {s.title}
            </h3>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(37,68,65,.68)" }}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
