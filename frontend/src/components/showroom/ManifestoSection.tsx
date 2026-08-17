import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { displaySerifFont, showroomMonoFont } from "@/lib/fonts";

export default async function ManifestoSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Showroom.manifesto" });

  const columns = [
    { eyebrow: t("whyEyebrow"), heading: t("whyHeading"), body: t("whyBody") },
    { eyebrow: t("howEyebrow"), heading: t("howHeading"), body: t("howBody") },
    { eyebrow: t("whatEyebrow"), heading: t("whatHeading"), body: t("whatBody") },
  ];
  const images = [
    { src: "/img/showroom/scene_traffic.png", caption: t("caption1") },
    { src: "/img/showroom/scene_office.png", caption: t("caption2") },
    { src: "/img/showroom/scene_papers.png", caption: t("caption3") },
  ];

  return (
    <div className="w-full bg-dark-slate text-white" style={{ marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)", width: "100vw" }}>
      <div className="max-w-[1160px] mx-auto px-8 grid gap-11" style={{ padding: "80px 32px 44px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {columns.map((col) => (
          <div key={col.eyebrow}>
            <p className={showroomMonoFont.className} style={{ fontSize: 11.5, letterSpacing: ".16em", color: "var(--color-seagrass)" }}>
              {col.eyebrow.toUpperCase()}
            </p>
            <h3 className={displaySerifFont.className} style={{ fontSize: 26, lineHeight: 1.3 }}>
              {col.heading}
            </h3>
            <p className="mt-3" style={{ fontSize: 16, lineHeight: 1.65, color: "rgba(255,255,255,.72)" }}>
              {col.body}
            </p>
          </div>
        ))}
      </div>
      <div className="max-w-[1160px] mx-auto px-8 grid gap-[22px]" style={{ padding: "0 32px 84px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {images.map((img) => (
          <div key={img.src}>
            <img src={img.src} alt="" className="w-full" style={{ borderRadius: 18 }} />
            <p className="mt-3" style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(255,255,255,.66)" }}>
              {img.caption}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
