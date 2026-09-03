"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { siteSansFont } from "@/lib/fonts";

// Typing a dream here and hitting "Skapa" takes the visitor straight into
// project creation with the title prefilled — /projects/new already
// supports ?title=... (see ideas/[id]/page.tsx for the existing pattern),
// so this needs no new backend work. Anonymous visitors bounce through
// /login first, same as every other creation entry point in the app.
export default function IdeaBand({ copy }: { copy: Record<string, string> }) {
  const t = useTranslations("Showroom.ideaBand");
  const c = (key: string) => copy[`Showroom.ideaBand.${key}`] ?? t(key);
  const router = useRouter();
  const [dream, setDream] = useState("");

  function create() {
    const trimmed = dream.trim();
    if (!trimmed) return;
    router.push(`/projects/new?title=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className={`${siteSansFont.className} w-full`} style={{ background: "#fafaf8", borderBottom: "1px solid rgba(178,176,155,.35)" }}>
      <div className="max-w-6xl mx-auto px-6 py-[18px] flex flex-wrap items-center gap-8">
        <div className="flex-none w-[158px] rounded-2xl overflow-hidden bg-[#88D5F5]">
          <img src="/img/showroom/scene_papers.png" alt="" className="w-full" />
        </div>
        <div className="flex-1 min-w-[240px]">
          <h2 className="text-dark-slate" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.01em", lineHeight: 1.25 }}>
            {c("heading")}
          </h2>
        </div>
        <input
          type="text"
          value={dream}
          onChange={(e) => setDream(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") create();
          }}
          placeholder={c("placeholder")}
          className="flex-1 text-dark-slate bg-white border border-muted-teal/50 rounded-xl outline-none"
          style={{ fontSize: 15, padding: "13px 15px", minWidth: 220 }}
        />
        <button
          type="button"
          onClick={create}
          className="text-white bg-seagrass hover:bg-dark-slate rounded-xl transition-colors font-medium"
          style={{ fontSize: 15, padding: "14px 24px" }}
        >
          {c("cta")}
        </button>
      </div>
    </div>
  );
}
