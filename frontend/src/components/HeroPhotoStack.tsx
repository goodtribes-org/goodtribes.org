"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { toProxyUrl } from "@/lib/storageUrl";
import { handwritingFont } from "@/lib/fonts";
import { CARD_SHADOW, PHOTO_TILT } from "@/lib/heroCardStyle";
import type { HeroSlideData } from "@/lib/heroSlides";

export default function HeroPhotoStack({
  slides,
  heading,
  canEdit,
}: {
  slides: HeroSlideData[];
  heading: string;
  canEdit: boolean;
}) {
  const t = useTranslations("HeroPhotoStack");
  const first = slides[0];

  if (!first) {
    return canEdit ? (
      <div className="relative z-10 flex justify-center px-4 py-12">
        <Link
          href="/site-admin/hero-carousel"
          className="border-2 border-dashed border-dark-slate/15 rounded-2xl px-6 py-4 text-sm text-dark-slate/40 hover:text-dark-slate/60 hover:border-dark-slate/25 transition-colors"
        >
          {t("addSlideLink")}
        </Link>
      </div>
    ) : null;
  }

  const tilt = PHOTO_TILT[0];

  return (
    <div className="relative">
      {/* Bakgrund: samma bild, blurrad */}
      <div className="absolute inset-0 overflow-hidden">
        <img src={toProxyUrl(first.imageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110" />
      </div>

      <div className="relative z-10 flex justify-center px-4 pt-0 pb-6">
        <div className="flex w-full max-w-6xl flex-col items-center gap-3">
          <h1
            className={`${handwritingFont.className} text-center leading-tight`}
            style={{
              color: "white",
              textShadow: "-1px -1px 0 #999, 1px -1px 0 #999, -1px 1px 0 #999, 1px 1px 0 #999, 2px 4px 12px rgba(0,0,0,0.35)",
              marginTop: 24,
            }}
          >
            <span style={{ fontSize: 56 }}>{heading}</span>
          </h1>

          <div className="flex w-full items-center justify-center py-6">
            <div className="relative w-full" style={{ maxWidth: 620 }}>
              <div
                className="relative w-full"
                style={{
                  aspectRatio: "16 / 10",
                  transform: `rotate(${tilt.rotate}deg) translate(${tilt.x}px, ${tilt.y}px)`,
                }}
              >
                <div className={`absolute inset-0 overflow-hidden bg-white p-3 ${CARD_SHADOW}`}>
                  <div className="relative h-full w-full overflow-hidden">
                    <img src={toProxyUrl(first.imageUrl)} alt={first.alt} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
