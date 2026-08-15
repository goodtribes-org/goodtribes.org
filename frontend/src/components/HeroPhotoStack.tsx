"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { toProxyUrl } from "@/lib/storageUrl";
import { handwritingFont } from "@/lib/fonts";
import type { HeroSlideData } from "@/lib/heroSlides";

const CARD_SHADOW =
  "shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.15)] ring-1 ring-black/5";

// Per-photo tilt/offset so the photo looks like a physical print set down a little carelessly,
// rather than a perfectly centered, perfectly straight image.
const PHOTO_TILT = [
  { rotate: -1, x: 0, y: 0 },
  { rotate: 1.5, x: 6, y: -4 },
  { rotate: -1.5, x: -8, y: 5 },
  { rotate: 1, x: 4, y: 6 },
  { rotate: -2, x: -6, y: -3 },
  { rotate: 2, x: 8, y: 2 },
];

export default function HeroPhotoStack({
  slides: PHOTOS,
  heading,
  canEdit,
}: {
  slides: HeroSlideData[];
  heading: string;
  canEdit: boolean;
}) {
  const t = useTranslations("HeroPhotoStack");

  if (PHOTOS.length === 0) {
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

  return (
    <div className="relative">
      {/* Bakgrund: första bilden, blurrad, täcker hela höjden av de staplade bilderna */}
      <div className="absolute inset-0 overflow-hidden">
        <img src={toProxyUrl(PHOTOS[0].imageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110" />
      </div>

      <div className="relative z-10 flex justify-center px-4 pt-0 pb-6">
        <div className="flex w-full max-w-6xl flex-col items-center gap-3">
          <style>{`
            @keyframes heroCaptionIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .hero-caption-in { animation: heroCaptionIn 0.3s ease-out; }
          `}</style>

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

          <div className="flex w-full flex-col items-center gap-16 py-6">
            {PHOTOS.map((slide, i) => {
              const tilt = PHOTO_TILT[i % PHOTO_TILT.length];
              return (
                <div key={slide.id} className="flex w-full items-center justify-center">
                  <div className="relative w-full" style={{ maxWidth: 620 }}>
                    <div
                      className="relative w-full transition-transform duration-500 ease-out"
                      style={{
                        aspectRatio: "16 / 10",
                        transform: `rotate(${tilt.rotate}deg) translate(${tilt.x}px, ${tilt.y}px)`,
                      }}
                    >
                      <div className={`hero-caption-in absolute inset-0 overflow-hidden bg-white p-3 ${CARD_SHADOW}`}>
                        <div className="relative h-full w-full overflow-hidden">
                          <img src={toProxyUrl(slide.imageUrl)} alt={slide.alt} className="absolute inset-0 w-full h-full object-cover" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
