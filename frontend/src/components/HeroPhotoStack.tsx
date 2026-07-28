"use client";

import { useState } from "react";
import { toProxyUrl } from "@/lib/storageUrl";
import { heroTintClass } from "@/lib/heroTint";
import HeroCarouselDialog from "@/components/HeroCarouselDialog";
import type { HeroSlideData } from "@/lib/heroSlides";

const CARD_SHADOW =
  "shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.15)] ring-1 ring-black/5";

// Per-photo tilt/offset so the photo looks like a physical print set down a little carelessly,
// rather than a perfectly centered, perfectly straight image. The text card uses the opposite tilt.
const PHOTO_TILT = [
  { rotate: -1, x: 0, y: 0 },
  { rotate: 1.5, x: 6, y: -4 },
  { rotate: -1.5, x: -8, y: 5 },
  { rotate: 1, x: 4, y: 6 },
  { rotate: -2, x: -6, y: -3 },
  { rotate: 2, x: 8, y: 2 },
];

export default function HeroPhotoStack({ slides, canEdit }: { slides: HeroSlideData[]; canEdit: boolean }) {
  const [PHOTOS, setPhotos] = useState(slides);
  const [active, setActive] = useState(0);
  const [managing, setManaging] = useState(false);
  const current = PHOTOS[active];

  if (!current) {
    return canEdit ? (
      <div className="relative z-10 flex justify-center px-4 py-12">
        <button
          type="button"
          onClick={() => setManaging(true)}
          className="border-2 border-dashed border-dark-slate/15 rounded-2xl px-6 py-4 text-sm text-dark-slate/40 hover:text-dark-slate/60 hover:border-dark-slate/25 transition-colors"
        >
          + Lägg till hero-slide
        </button>
        {managing && (
          <HeroCarouselDialog
            slides={PHOTOS}
            onSlidesChange={(next) => {
              setPhotos(next);
              setActive(0);
            }}
            onClose={() => setManaging(false)}
          />
        )}
      </div>
    ) : null;
  }

  const tilt = PHOTO_TILT[active % PHOTO_TILT.length];

  return (
    <>
      {/* Bakgrund: samma bild som visas, crossfadeas vid byte */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: "400px" }}>
        {PHOTOS.map((photo, i) => (
          <div
            key={photo.id}
            className="absolute inset-0 transition-opacity duration-700 ease-out"
            style={{ opacity: active === i ? 1 : 0 }}
          >
            <img src={toProxyUrl(photo.imageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110" />
          </div>
        ))}
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
            className="text-5xl md:text-6xl font-bold text-center leading-tight"
            style={{ color: "white", textShadow: "0 3px 8px rgba(0,0,0,0.25)", marginTop: 0 }}
          >
            <span style={{ fontSize: 60 }}>Välkommen till GoodTribes</span>
          </h1>

          <div className="relative grid w-full gap-8 items-center md:grid-cols-2">
            <button
              type="button"
              onClick={() => setActive((active - 1 + PHOTOS.length) % PHOTOS.length)}
              aria-label="Föregående"
              className="absolute -left-2 md:-left-14 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 shadow-md ring-1 ring-black/5 flex items-center justify-center text-dark-slate/70 hover:text-dark-slate hover:bg-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setActive((active + 1) % PHOTOS.length)}
              aria-label="Nästa"
              className="absolute -right-2 md:-right-14 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 shadow-md ring-1 ring-black/5 flex items-center justify-center text-dark-slate/70 hover:text-dark-slate hover:bg-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            {/* Text — alltid synlig, till vänster, samma storlek och polaroid-form som bilden */}
            <div
              className="w-full md:max-w-[620px] md:aspect-[16/10] transition-transform duration-500 ease-out"
              style={{
                transform: `rotate(${-tilt.rotate}deg) translate(${-tilt.x}px, ${-tilt.y}px)`,
              }}
            >
              <div className={`relative h-full bg-white p-3 ${CARD_SHADOW}`}>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setManaging(true)}
                    className="absolute top-3 right-3 z-10 text-xs font-medium text-dark-slate/50 hover:text-coral transition-colors bg-white/70 rounded-md px-2 py-1"
                  >
                    ✎ Redigera
                  </button>
                )}
                <div className={`h-full md:overflow-y-auto border border-muted-teal/20 px-6 pt-3 pb-5 flex flex-col justify-start ${heroTintClass(current.tintColor, current.tintOpacity)}`}>
                  <div key={`text-${current.id}`} className="hero-caption-in flex flex-col items-start text-left">
                    <h1 className="font-bold text-dark-slate pr-16" style={{ textWrap: "balance", fontSize: 26 }}>
                      {current.heading}
                    </h1>
                    <p className="mt-2 text-dark-slate/80" style={{ fontSize: 14, lineHeight: 1.45 }}>
                      {current.body}
                      {current.bodyLine2 && (
                        <>
                          <br />
                          {current.bodyLine2}
                        </>
                      )}
                    </p>
                    {current.body2 && (
                      <p className="mt-2 text-dark-slate/80" style={{ fontSize: 14, lineHeight: 1.45 }}>{current.body2}</p>
                    )}
                    {current.obstacles.length > 0 && (
                      <>
                        <ul className="mt-3 flex flex-col gap-2.5">
                          {current.obstacles.map((o) => (
                            <li key={o.lead} className="text-sm text-dark-slate/80">
                              <span className="font-bold text-seagrass">{o.lead}</span> {o.text}
                            </li>
                          ))}
                        </ul>
                        {current.outro && (
                          <p className="mt-3 text-dark-slate/80" style={{ fontSize: 14, lineHeight: 1.45 }}>{current.outro}</p>
                        )}
                      </>
                    )}
                    {current.points.length > 0 && (
                      <ul className="mt-3 flex flex-col gap-1.5">
                        {current.points.map((p) => (
                          <li key={p.pct} className="flex items-center gap-3">
                            <span className="w-14 shrink-0 text-right text-sm font-bold text-seagrass">{p.pct}</span>
                            <span className="text-sm text-dark-slate/80">{p.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Foto — mindre, till höger */}
            <div className="hidden md:flex items-center justify-self-center w-full" style={{ maxWidth: 620 }}>
              <div
                className="relative w-full min-w-0 transition-transform duration-500 ease-out"
                style={{
                  aspectRatio: "16 / 10",
                  transform: `rotate(${tilt.rotate}deg) translate(${tilt.x}px, ${tilt.y}px)`,
                }}
              >
                <div
                  key={current.id}
                  className={`hero-caption-in absolute inset-0 overflow-hidden bg-white p-3 ${CARD_SHADOW}`}
                >
                  <div className="relative h-full w-full overflow-hidden">
                    <img src={toProxyUrl(current.imageUrl)} alt={current.alt} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {managing && (
        <HeroCarouselDialog
          slides={PHOTOS}
          onSlidesChange={(next) => {
            setPhotos(next);
            setActive((i) => Math.min(i, Math.max(next.length - 1, 0)));
          }}
          onClose={() => setManaging(false)}
        />
      )}
    </>
  );
}
