"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import RichTextEditor from "@/components/RichTextEditor";
import type { HeroSlideData } from "@/lib/heroSlides";
import { saveHomeHeroContent } from "@/app/[locale]/home-hero-actions";
import type { Locale } from "next-intl";

// The redesigned homepage (2026-08) shows a single hero built from just a
// heading and a body — HomeHero.tsx reads only the first HomeHeroSlide row.
// This editor matches that exactly: one heading field, one rich-text body
// field, one Save. No image/alt/second-line/obstacles/points/tint fields —
// those belonged to the old multi-slide, tilted-photo-card hero this
// replaced, and nothing on the page reads them anymore.
export default function HeroCarouselEditor({ initialSlide, locale }: { initialSlide: HeroSlideData | null; locale: Locale }) {
  const t = useTranslations("HeroCarouselEditor");
  const [id, setId] = useState(initialSlide?.id ?? null);
  const [heading, setHeading] = useState(initialSlide?.heading ?? "");
  const [body, setBody] = useState(initialSlide?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveHomeHeroContent(id, heading, body, locale);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setId(result.slide.id);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      <input
        value={heading}
        onChange={(e) => setHeading(e.target.value)}
        placeholder={t("headingPlaceholder")}
        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
      />
      <div>
        <span className="text-xs font-medium text-dark-slate/60 block mb-1">{t("bodyLabel")}</span>
        <RichTextEditor content={body} onChange={setBody} compact />
      </div>

      {error && <p className="text-xs text-coral">{error}</p>}
      <div className="flex items-center justify-end gap-3 pt-2">
        {saved && !isPending && <span className="text-xs text-seagrass">{t("savedNotice")}</span>}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-seagrass text-white hover:bg-seagrass/90 transition-colors disabled:opacity-50"
        >
          {t("saveButton")}
        </button>
      </div>
    </div>
  );
}
