"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { displaySerifFont, showroomBodyFont } from "@/lib/fonts";

export default function IdeaBand() {
  const t = useTranslations("Showroom.ideaBand");
  const [dream, setDream] = useState("");
  const [litDream, setLitDream] = useState<string | null>(null);

  function light() {
    const trimmed = dream.trim();
    if (!trimmed) return;
    setLitDream(trimmed);
    setDream("");
  }

  return (
    <div className="w-full bg-[#f6f5f2]">
      <div className="max-w-[1160px] mx-auto px-8 py-[34px] flex flex-wrap items-center gap-8">
        <div className="flex-none w-[158px] rounded-2xl overflow-hidden bg-[#88D5F5]">
          <img src="/img/showroom/scene_papers.png" alt="" className="w-full" />
        </div>
        <div className="flex-1 min-w-[240px]">
          <h2 className={`${displaySerifFont.className} text-dark-slate`} style={{ fontSize: 26, lineHeight: 1.2, marginBottom: 4 }}>
            {t("heading")}
          </h2>
          <p className={`${showroomBodyFont.className} text-dark-slate/60`} style={{ fontSize: 14.5 }}>
            {t("subheading")}
          </p>
        </div>
        <input
          type="text"
          value={dream}
          onChange={(e) => setDream(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") light();
          }}
          placeholder={t("placeholder")}
          className={`${showroomBodyFont.className} flex-1 text-dark-slate bg-white border border-muted-teal/50 rounded-xl outline-none`}
          style={{ fontSize: 15, padding: "13px 15px", minWidth: 220 }}
        />
        <button
          type="button"
          onClick={light}
          className={`${showroomBodyFont.className} text-white bg-seagrass hover:bg-dark-slate rounded-xl transition-colors font-medium`}
          style={{ fontSize: 15, padding: "14px 24px" }}
        >
          {t("cta")}
        </button>
        {litDream && (
          <div className="basis-full pt-5 border-t border-dashed border-muted-teal/50 flex items-center gap-4">
            <img src="/img/showroom/bulb_t.png" alt="" className="object-contain flex-shrink-0" style={{ width: 64, height: 64 }} />
            <p className={showroomBodyFont.className} style={{ fontSize: 14, lineHeight: 1.5, color: "rgba(37,68,65,.62)" }}>
              <span className="font-medium block" style={{ fontSize: 16, color: "#254441" }}>
                &ldquo;{litDream}&rdquo;
              </span>
              {t("receiptBody")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
