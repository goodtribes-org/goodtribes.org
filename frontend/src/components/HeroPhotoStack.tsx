"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const STACK_MAX_W = 680;
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

type Photo = { src: string; alt: string; heading: string; body: string; menuLabel: string };

const PHOTOS: Photo[] = [
  {
    src: "/img/Slide1.jpg",
    alt: "GoodTribes — Crowdsourcing for Good",
    heading: "GoodTribes",
    body: "Crowdsourcing for good — gå med och gör skillnad!",
    menuLabel: "GoodTribes",
  },
  {
    src: "/img/Slide2.png",
    alt: "Har du en dröm? — en man kedjad till sitt skrivbord drömmer om att förverkliga sin idé",
    heading: "Har du en dröm?",
    body: "Oavsett hur stor eller liten din idé är — GoodTribes hjälper dig att förverkliga den.",
    menuLabel: "Today",
  },
  {
    src: "/img/do-you-have-a-dream.png",
    alt: "En person lyfts av en ballong format som en glödlampa — en idé som lyfter",
    heading: "Låt din idé lyfta",
    body: "Stora förändringar börjar ofta med en enkel tanke. Vi hjälper dig ta första steget mot att förverkliga den.",
    menuLabel: "Dream",
  },
  {
    src: "/img/want-a-change.png",
    alt: "Vill du förändra?",
    heading: "Vill du förändra?",
    body: "Hitta likasinnade och organisationer som vill göra världen lite bättre — tillsammans.",
    menuLabel: "Run",
  },
  {
    src: "/img/what-is-goodtribes.png",
    alt: "Vad är GoodTribes?",
    heading: "Vad är GoodTribes?",
    body: "En plattform som kopplar ihop skickliga volontärer med samhällsdrivna organisationer.",
    menuLabel: "Together",
  },
  {
    src: "/img/want-to-be-a-winner.png",
    alt: "Vill du bidra?",
    heading: "Vill du bidra?",
    body: "Bidra med dina kompetenser och gör verklig skillnad i projekt som betyder något.",
    menuLabel: "Win-Win-Win",
  },
];

export default function HeroPhotoStack() {
  const [active, setActive] = useState(0);
  const [closed, setClosed] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const current = PHOTOS[active];
  const isIntro = active === 0;

  return (
    <>
      {/* Bakgrund: samma bild som den som visas just nu, crossfadeas vid byte */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: "400px" }}>
        {PHOTOS.map((photo, i) => (
          <div
            key={photo.src}
            className="absolute inset-0 transition-opacity duration-700 ease-out"
            style={{ opacity: active === i ? 1 : 0 }}
          >
            <Image src={photo.src} alt="" fill unoptimized className="object-cover blur-2xl scale-110" sizes="100vw" />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex justify-center px-4 pt-8 pb-6">
        <div className="flex w-full max-w-3xl flex-col items-center gap-5">
          <style>{`
            @keyframes heroCaptionIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .hero-caption-in { animation: heroCaptionIn 0.3s ease-out; }
          `}</style>

          <div className="relative flex w-full max-w-3xl flex-col items-center">
            <nav className="flex flex-wrap items-center justify-center gap-1 rounded-full bg-white/80 backdrop-blur-sm p-1.5 shadow-sm ring-1 ring-black/5">
              {PHOTOS.map((photo, i) => {
                const isActive = hasInteracted && active === i;
                const isOpen = isActive && !closed;
                return (
                  <button
                    key={photo.src}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        setClosed((c) => !c);
                      } else {
                        setActive(i);
                        setClosed(false);
                        setHasInteracted(true);
                      }
                    }}
                    aria-current={isActive}
                    aria-expanded={isOpen}
                    className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-coral text-white shadow-sm"
                        : "text-dark-slate/60 hover:text-dark-slate hover:bg-black/5"
                    }`}
                  >
                    {i + 1}. {photo.menuLabel}
                  </button>
                );
              })}
            </nav>

            {!closed && (
              <div
                className={`absolute left-1/2 top-full mt-4 w-full -translate-x-1/2 rounded-3xl bg-white/95 z-20 ${CARD_SHADOW}`}
              >
                <button
                  type="button"
                  onClick={() => setClosed(true)}
                  aria-label="Stäng"
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-dark-slate/40 transition-colors hover:bg-black/5 hover:text-dark-slate"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M1 1l12 12M13 1L1 13" />
                  </svg>
                </button>

                <div
                  key={`float-${current.src}`}
                  className={`hero-caption-in text-center ${
                    isIntro ? "px-6 pt-8 pb-8 flex flex-col items-center" : "mx-auto max-w-md px-4 pt-6 pb-6"
                  }`}
                >
                  {isIntro ? (
                    <>
                      <h1 className="text-3xl md:text-4xl font-bold text-dark-slate">
                        Tillsammans gör vi bra idéer till verklighet
                      </h1>
                      <p className="mt-4 text-dark-slate/80">
                        Runt om i världen bubblar det av fantastiska idéer — projekt som vill rädda bin, städa hav
                        eller skapa tryggare kvarter. Samtidigt finns det tusentals människor som vill hjälpa till
                        och göra skillnad, men som inte vet var de ska börja.
                      </p>
                      <p className="mt-3 text-dark-slate/80">
                        GoodTribes är mötesplatsen däremellan. Vi kopplar ihop visionära projekt med engagerade
                        volontärer, så att goda idéer inte stannar vid en dröm utan faktiskt blir verklighet.
                      </p>
                      <p className="mt-4 text-sm text-dark-slate/70">
                        <strong className="text-dark-slate">Har du ett projekt?</strong> Beskriv vad du behöver.
                        <span className="mx-1.5">·</span>
                        <strong className="text-dark-slate">Vill du hjälpa till?</strong> Dela med dig av din tid
                        eller kunskap.
                      </p>
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                        <Link
                          href="/projects/new"
                          className="bg-coral text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-watermelon transition-colors"
                        >
                          Skapa ett projekt
                        </Link>
                        <Link
                          href="/projects"
                          className="text-coral text-sm font-medium px-5 py-2.5 rounded-lg border border-coral hover:bg-coral/5 transition-colors"
                        >
                          Utforska projekt
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-base text-dark-slate">{current.heading}</p>
                      <p className="mt-1 text-sm text-dark-slate/80">{current.body}</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div
            className="relative w-full min-w-0 transition-transform duration-500 ease-out"
            style={{
              maxWidth: STACK_MAX_W,
              aspectRatio: "16 / 9",
              transform: `rotate(${PHOTO_TILT[active].rotate}deg) translate(${PHOTO_TILT[active].x}px, ${PHOTO_TILT[active].y}px)`,
            }}
          >
            <div
              key={current.src}
              className={`hero-caption-in absolute inset-0 overflow-hidden bg-white p-4 ${CARD_SHADOW}`}
            >
              <div className="relative h-full w-full overflow-hidden">
                <Image src={current.src} alt={current.alt} fill unoptimized className="object-cover" />
              </div>
            </div>
          </div>

          <span className="inline-block text-sm font-semibold text-dark-slate bg-white/95 shadow-sm rounded-full px-4 py-1.5">
            GoodTribes.org är i Beta och under kraftig utveckling
          </span>
        </div>
      </div>
    </>
  );
}
