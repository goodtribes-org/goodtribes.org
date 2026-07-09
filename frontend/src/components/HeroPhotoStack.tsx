"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";

const STACK_MAX_W = 680;
const CARD_SHADOW =
  "shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.15)] ring-1 ring-black/5";

// Per-photo tilt/offset so the photo looks like a physical print set down a little carelessly,
// rather than a perfectly centered, perfectly straight image.
const PHOTO_TILT = [
  { rotate: -2, x: 0, y: 0 },
  { rotate: 3, x: 6, y: -4 },
  { rotate: -3, x: -8, y: 5 },
  { rotate: 2, x: 4, y: 6 },
  { rotate: -4, x: -6, y: -3 },
  { rotate: 4, x: 8, y: 2 },
];

// One cheerful color per card back, all bright enough for white text on top.
const BACK_STYLES = [
  { bg: "bg-coral", heading: "text-white", body: "text-white/85" },
  { bg: "bg-[#d97706]", heading: "text-white", body: "text-white/85" },
  { bg: "bg-seagrass", heading: "text-white", body: "text-white/85" },
  { bg: "bg-watermelon", heading: "text-white", body: "text-white/85" },
  { bg: "bg-[#2563eb]", heading: "text-white", body: "text-white/85" },
  { bg: "bg-[#7c3aed]", heading: "text-white", body: "text-white/85" },
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

const FLIP_DELAY_MS = 2500;

export default function HeroPhotoStack({ children }: { children?: ReactNode }) {
  const [active, setActive] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const current = PHOTOS[active];

  useEffect(() => {
    setFlipped(false);
    const timer = setTimeout(() => setFlipped(true), FLIP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active]);

  return (
    <>
      {/* Bakgrund: samma bild som den som visas just nu, crossfadeas vid byte */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: "460px" }}>
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

      <div className="relative z-10 flex justify-center px-4 pt-8 pb-10">
        <div className="flex w-full max-w-3xl flex-col items-center gap-5">
          <style>{`
            @keyframes heroCaptionIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .hero-caption-in { animation: heroCaptionIn 0.3s ease-out; }
          `}</style>

          <div
            className="relative w-full min-w-0 transition-transform duration-500 ease-out"
            style={{
              maxWidth: STACK_MAX_W,
              aspectRatio: "16 / 9",
              perspective: "1500px",
              transform: `rotate(${PHOTO_TILT[active].rotate}deg) translate(${PHOTO_TILT[active].x}px, ${PHOTO_TILT[active].y}px)`,
            }}
          >
            <div
              key={current.src}
              className="hero-caption-in absolute inset-0 transition-transform duration-700 ease-in-out"
              style={{
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Framsida — fotot */}
              <div
                className={`absolute inset-0 overflow-hidden bg-white p-4 ${CARD_SHADOW}`}
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="relative h-full w-full overflow-hidden">
                  <Image src={current.src} alt={current.alt} fill unoptimized className="object-cover" />
                </div>
              </div>

              {/* Baksida — texten, egen färg per bild */}
              <div
                className={`absolute inset-0 overflow-hidden p-6 flex flex-col items-center justify-center text-center ${BACK_STYLES[active].bg} ${CARD_SHADOW}`}
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <p className={`font-bold text-lg leading-tight ${BACK_STYLES[active].heading}`}>{current.heading}</p>
                <p className={`mt-2 text-sm leading-snug ${BACK_STYLES[active].body}`}>{current.body}</p>
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-2">
            {PHOTOS.map((photo, i) => (
              <button
                key={photo.src}
                type="button"
                onClick={() => setActive(i)}
                aria-current={active === i}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  active === i
                    ? "bg-coral text-white"
                    : "bg-white/80 text-dark-slate/70 hover:bg-white"
                }`}
              >
                {i + 1}. {photo.menuLabel}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="relative z-10 flex justify-center px-4 py-10">{children}</div>
    </>
  );
}
