"use client";

import { useTranslations } from "next-intl";
import { toProxyUrl } from "@/lib/storageUrl";
import { PHOTO_TILT } from "@/lib/heroCardStyle";
import HeroSlideRow from "./HeroSlideRow";
import type { HeroSlideData } from "@/lib/heroSlides";

export default function HeroSlideText({
  slides,
  canEdit,
}: {
  slides: HeroSlideData[];
  canEdit: boolean;
}) {
  const t = useTranslations("HeroPhotoStack");

  if (slides.length <= 1) return null;

  const [, ...rest] = slides;

  return (
    <div className="flex flex-col gap-16">
      {/* Resten av bilderna, utanför hero — samma bild+text-rad som goodtribes-bilden i hero, varje bild kant-till-kant med sin egen blurrade bakgrund */}
      {rest.map((slide, i) => {
        const tilt = PHOTO_TILT[(i + 1) % PHOTO_TILT.length];
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
