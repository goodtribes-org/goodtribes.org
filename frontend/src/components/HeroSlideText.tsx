"use client";

import { useTranslations } from "next-intl";
import { toProxyUrl } from "@/lib/storageUrl";
import { PHOTO_TILT } from "@/lib/heroCardStyle";
import HeroSlideRow from "./HeroSlideRow";
import type { HeroSlideData } from "@/lib/heroSlides";

// Renders whichever slides are passed in, each in its own full-bleed
// section — it no longer assumes "everything but the first slide" itself.
// The caller (homepage) owns that slicing so it can split the hero-slide
// list around other sections it wants to insert between two slides
// (e.g. StatsRow between slide 2 and slide 3) without breaking the tilt
// alternation — hence `tiltOffset`, which keeps each split's tilts
// continuing where the previous one left off instead of restarting at 0.
export default function HeroSlideText({
  slides,
  canEdit,
  tiltOffset = 0,
}: {
  slides: HeroSlideData[];
  canEdit: boolean;
  tiltOffset?: number;
}) {
  const t = useTranslations("HeroPhotoStack");

  if (slides.length === 0) return null;

  return (
    <div className="flex flex-col gap-16">
      {slides.map((slide, i) => {
        const tilt = PHOTO_TILT[(i + tiltOffset) % PHOTO_TILT.length];
        return (
          <div key={slide.id} className="relative" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
            <div className="absolute inset-0 overflow-hidden">
              <img src={toProxyUrl(slide.imageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110" />
            </div>
            <div className="relative z-10 flex justify-center px-4 py-10">
              <div className="w-full max-w-6xl">
                <HeroSlideRow slide={slide} tilt={tilt} canEdit={canEdit} editLinkLabel={t("editLink")} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
