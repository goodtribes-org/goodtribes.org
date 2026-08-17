"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { showroomMonoFont, showroomBodyFont } from "@/lib/fonts";

export default function LiveTicker({ items }: { items: string[] }) {
  const t = useTranslations("Showroom.liveRow");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => setTick((i) => (i + 1) % items.length), 3800);
    return () => clearInterval(id);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div
      className="w-full"
      style={{
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        width: "100vw",
        background: "rgba(9,120,9,.06)",
        borderTop: "1px solid rgba(178,176,155,.35)",
        borderBottom: "1px solid rgba(178,176,155,.35)",
      }}
    >
      <div className="max-w-[1160px] mx-auto px-8 flex items-center gap-3.5" style={{ padding: "13px 32px" }}>
        <span className="inline-block rounded-full bg-seagrass flex-shrink-0" style={{ width: 9, height: 9 }} />
        <span className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)", flexShrink: 0 }}>
          {t("label").toUpperCase()}
        </span>
        <span className={`${showroomBodyFont.className} text-dark-slate/80 truncate`} style={{ fontSize: 14.5 }}>
          {items[tick % items.length]}
        </span>
        <a href="#showroom-flode" className={`${showroomBodyFont.className} text-dark-slate/55 ml-auto flex-shrink-0 hover:underline`} style={{ fontSize: 13.5 }}>
          {t("allLink")}
        </a>
      </div>
    </div>
  );
}
