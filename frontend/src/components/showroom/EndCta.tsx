import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { displaySerifFont } from "@/lib/fonts";

export default async function EndCta({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Showroom.endCta" });

  return (
    <div
      className="w-full bg-dark-slate text-white"
      style={{ marginTop: 72, marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)", width: "100vw" }}
    >
      <div className="max-w-[1160px] mx-auto px-8 flex items-center flex-wrap" style={{ padding: "88px 32px", gap: 56 }}>
        <img src="/img/showroom/bulb_t.png" alt="" className="flex-shrink-0" style={{ width: 150, height: 150, objectFit: "contain" }} />
        <div style={{ flex: "1 1 280px", minWidth: 280 }}>
          <h2 className={displaySerifFont.className} style={{ fontSize: "clamp(38px,4vw,56px)", lineHeight: 1.03, letterSpacing: "-.02em" }}>
            {t("heading")}
          </h2>
          <p className="mt-3 mb-6" style={{ fontSize: 18, lineHeight: 1.6, color: "rgba(255,255,255,.72)", maxWidth: "46ch" }}>
            {t("body")}
          </p>
          <div className="flex items-center gap-8 flex-wrap">
            <Link
              href="/projects/new"
              className="inline-block rounded-full bg-white text-dark-slate font-medium hover:text-white hover:bg-coral transition-colors"
              style={{ padding: "15px 30px", fontSize: 16 }}
            >
              {t("primaryCta")}
            </Link>
            <a href="#showroom" className="hover:opacity-100" style={{ fontSize: 16, color: "rgba(255,255,255,.75)", borderBottom: "1px solid rgba(255,255,255,.3)", paddingBottom: 2 }}>
              {t("secondaryCta")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
