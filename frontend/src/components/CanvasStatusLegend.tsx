"use client";

import { useTranslations } from "next-intl";

// Key for the coloured block borders (lib/canvasBlockStatus.ts). The colour
// is never the only signal: empty blocks say so in text, and filled ones
// carry the Vet/Antar badge.
export default function CanvasStatusLegend() {
  const t = useTranslations("CanvasStatusLegend");
  const item = (cls: string, label: string) => (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm border-2 bg-white ${cls}`} aria-hidden />
      {label}
    </span>
  );
  return (
    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-slate/60">
      {item("border-seagrass/70", t("known"))}
      {item("border-amber-400/70", t("assumed"))}
      {item("border-watermelon/45", t("empty"))}
    </p>
  );
}
