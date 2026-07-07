"use client";

import { useState } from "react";
import Image from "next/image";

const STACK_MAX_W = 680;
const CARD_SHADOW =
  "shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.15)] ring-1 ring-black/5";

// Transform per position-in-pile (0 = front/top, 5 = back), fanned out like a dropped stack of photos.
// Each back card points in its own distinct direction (spread downward/sideways only, never upward —
// an upward offset would poke into the caption text above) so none end up hidden behind another.
// z stays low and finite so the arrow buttons (z-20, see ArrowButton) always sit above the pile.
const PILE_TRANSFORMS = [
  { rotate: -1, x: 0, y: 0, z: 6 },
  { rotate: 3, x: 24, y: 16, z: 5 },
  { rotate: -7, x: -25, y: 17, z: 4 },
  { rotate: 6, x: 16, y: 30, z: 3 },
  { rotate: -5, x: -17, y: 32, z: 2 },
  { rotate: 8, x: 0, y: 38, z: 1 },
];

type Photo = { src: string; alt: string; heading: string; body: string };

const PHOTOS: Photo[] = [
  {
    src: "/img/Slide1.jpg",
    alt: "GoodTribes — Crowdsourcing for Good",
    heading: "GoodTribes",
    body: "Crowdsourcing for good — gå med och gör skillnad!",
  },
  {
    src: "/img/Slide2.png",
    alt: "Har du en dröm? — en man kedjad till sitt skrivbord drömmer om att förverkliga sin idé",
    heading: "Har du en dröm?",
    body: "Oavsett hur stor eller liten din idé är — GoodTribes hjälper dig att förverkliga den.",
  },
  {
    src: "/img/do-you-have-a-dream.png",
    alt: "En person lyfts av en ballong format som en glödlampa — en idé som lyfter",
    heading: "Låt din idé lyfta",
    body: "Stora förändringar börjar ofta med en enkel tanke. Vi hjälper dig ta första steget mot att förverkliga den.",
  },
  {
    src: "/img/want-a-change.png",
    alt: "Vill du förändra?",
    heading: "Vill du förändra?",
    body: "Hitta likasinnade och organisationer som vill göra världen lite bättre — tillsammans.",
  },
  {
    src: "/img/what-is-goodtribes.png",
    alt: "Vad är GoodTribes?",
    heading: "Vad är GoodTribes?",
    body: "En plattform som kopplar ihop skickliga volontärer med samhällsdrivna organisationer.",
  },
  {
    src: "/img/want-to-be-a-winner.png",
    alt: "Vill du bidra?",
    heading: "Vill du bidra?",
    body: "Bidra med dina kompetenser och gör verklig skillnad i projekt som betyder något.",
  },
];

function ArrowButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Föregående bild" : "Nästa bild"}
      className="relative z-20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-dark-slate/60 ring-1 ring-black/10 shadow-sm transition-colors hover:text-coral hover:ring-coral/40"
    >
      <span aria-hidden="true" className="text-3xl leading-none">
        {direction === "prev" ? "‹" : "›"}
      </span>
    </button>
  );
}

export default function HeroPhotoStack() {
  const [order, setOrder] = useState(PHOTOS.map((_, i) => i));

  const next = () => setOrder((o) => [...o.slice(1), o[0]]);
  const prev = () => setOrder((o) => [o[o.length - 1], ...o.slice(0, -1)]);

  const front = PHOTOS[order[0]];

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-6">
      <style>{`
        @keyframes heroCaptionIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-caption-in { animation: heroCaptionIn 0.3s ease-out; }
      `}</style>
      <div key={front.src} className="hero-caption-in max-w-lg text-center">
        <p className="font-bold text-lg text-dark-slate leading-tight">{front.heading}</p>
        <p className="mt-1 text-sm text-dark-slate/60 leading-snug">{front.body}</p>
      </div>
      <div className="flex w-full items-center justify-center gap-3 sm:gap-5">
        <ArrowButton direction="prev" onClick={prev} />
        <div
          className="relative w-full min-w-0"
          style={{ maxWidth: STACK_MAX_W, aspectRatio: "16 / 9" }}
        >
          {order.map((photoIdx, position) => {
            const photo = PHOTOS[photoIdx];
            const t = PILE_TRANSFORMS[position];
            return (
              <div
                key={photo.src}
                className={`absolute inset-0 overflow-hidden rounded-xl bg-white p-4 transition-transform duration-500 ease-out ${CARD_SHADOW}`}
                style={{
                  transform: `translate(${t.x}px, ${t.y}px) rotate(${t.rotate}deg)`,
                  zIndex: t.z,
                }}
              >
                <div className="relative h-full w-full overflow-hidden rounded-md">
                  <Image src={photo.src} alt={photo.alt} fill unoptimized className="object-cover" />
                </div>
              </div>
            );
          })}
        </div>
        <ArrowButton direction="next" onClick={next} />
      </div>
    </div>
  );
}
