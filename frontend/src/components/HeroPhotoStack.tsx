"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

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

type Obstacle = { lead: string; text: string };

type Photo = {
  src: string;
  alt: string;
  heading: string;
  body?: string;
  obstacles?: Obstacle[];
  closing?: string;
  menuLabel: string;
  tint: string;
};

const PHOTOS: Photo[] = [
  {
    src: "/img/Slide1.jpg",
    alt: "GoodTribes — Crowdsourcing for Good",
    heading: "Välkommen till GoodTribes",
    menuLabel: "Kom igång",
    tint: "bg-coral/10",
  },
  {
    src: "/img/Slide2.png",
    alt: "Har du en dröm? — en man kedjad till sitt skrivbord drömmer om att förverkliga sin idé",
    heading: "Följ din dröm",
    body: "Alla människor har idéer och drömmar kan göra världen bättre för dem och andra. Problemet är att de flesta aldrig genomför sina ideer eller drömmar. Forskningen visar att över 92 % av alla människor aldrig når sina mål och drömmar. Forskningen visar på att tre stora hinder stoppar människor från att förverkliga sina livsdrömmar:",
    obstacles: [
      { lead: "Rädsla för misslyckande:", text: "Den evolutionära rädslan för att förlora status eller resurser är oftast starkare än drivkraften att vinna, vilket gör att vi väljer trygghet framför förändring." },
      { lead: "Mentala blockeringar:", text: "Många intalar sig själva att de saknar rätt talang eller förutsättningar, vilket leder till att de aldrig tar det första steget." },
      { lead: "Vaga målsättningar:", text: "Drömmar förblir ofta abstrakta tankar. Utan konkreta, mätbara delmål i vardagen är det svårt att omsätta visioner till verklig handling." },
    ],
    closing: "GoodTribes är utformad för att hjälpa dig förbi alla hinder…",
    menuLabel: "Våga",
    tint: "bg-seagrass/10",
  },
  {
    src: "/img/do-you-have-a-dream.png",
    alt: "En person lyfts av en ballong format som en glödlampa — en idé som lyfter",
    heading: "Våga följa din dröm",
    body: "Stora förändringar börjar med modet att ta första steget. Genom GoodTribes får du stöd och rätt kompetens för att förverkliga din idé — hur stor eller liten den än är.",
    menuLabel: "Dröm",
    tint: "bg-muted-teal/15",
  },
  {
    src: "/img/want-a-change.png",
    alt: "Vill du förändra?",
    heading: "Våga gå din egen väg",
    body: "Du behöver inte följa mallen för att göra skillnad. Med GoodTribes i ryggen vågar du lita på din egen väg och ta steget mot det du tror på.",
    menuLabel: "Testa",
    tint: "bg-dry-sage/20",
  },
  {
    src: "/img/what-is-goodtribes.png",
    alt: "Vad är GoodTribes?",
    heading: "Tillsammans når vi längre",
    body: "Verklig förändring kommer när privatpersoner, ideell sektor, näringsliv och forskarvärlden samverkar mot gemensamma mål. På GoodTribes möts ni i trygga, meningsfulla samarbeten.",
    menuLabel: "Utveckla",
    tint: "bg-watermelon/10",
  },
  {
    src: "/img/want-to-be-a-winner.png",
    alt: "Vill du bidra?",
    heading: "Alla vinner på att göra gott",
    body: "GoodTribes ger dig och din organisation möjlighet att leva gott och skapa värde av era insatser, må gott genom att göra det ni brinner för tillsammans med andra goda krafter, göra gott genom att förverkliga idéer som gör världen bättre — och uppnå era och andras drömmar.",
    menuLabel: "Alla vinner",
    tint: "bg-coral/15",
  },
];

export default function HeroPhotoStack() {
  const [active, setActive] = useState(0);
  const current = PHOTOS[active];
  const isIntro = active === 0;

  return (
    <>
      {/* Bakgrund: samma bild som visas, crossfadeas vid byte */}
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
        <div className="flex w-full max-w-6xl flex-col items-center gap-6">
          <style>{`
            @keyframes heroCaptionIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .hero-caption-in { animation: heroCaptionIn 0.3s ease-out; }
          `}</style>

          <nav className="flex flex-wrap items-center justify-center gap-1 rounded-full bg-white/80 backdrop-blur-sm p-1.5 shadow-sm ring-1 ring-black/5">
            {PHOTOS.map((photo, i) => (
              <button
                key={photo.src}
                type="button"
                onClick={() => setActive(i)}
                aria-current={active === i}
                className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  active === i
                    ? "bg-coral text-white shadow-sm"
                    : "text-dark-slate/60 hover:text-dark-slate hover:bg-black/5"
                }`}
              >
                {i + 1}. {photo.menuLabel}
              </button>
            ))}
          </nav>

          <div className="grid w-full gap-8 items-stretch md:grid-cols-2">
            {/* Text — alltid synlig, till vänster, samma polaroid-form som bilden */}
            <div
              className="transition-transform duration-500 ease-out"
              style={{
                transform: `rotate(${-PHOTO_TILT[active].rotate}deg) translate(${-PHOTO_TILT[active].x}px, ${-PHOTO_TILT[active].y}px)`,
              }}
            >
              <div className={`h-full overflow-hidden bg-white p-3 ${CARD_SHADOW}`}>
                <div className={`h-full border border-muted-teal/20 px-6 py-6 flex flex-col justify-start ${current.tint}`}>
                  <div key={`text-${current.src}`} className="hero-caption-in flex flex-col items-start text-left">
                    {isIntro ? (
                      <>
                        <h1 className="text-3xl md:text-4xl font-bold text-dark-slate" style={{ textWrap: "balance" }}>
                          <span style={{ fontSize: 30 }}>Välkommen till GoodTribes</span>
                        </h1>
                        <p className="mt-4 text-dark-slate/80">
                          GoodTribes.org är en öppen &rdquo;drömfabrik&rdquo; där människor och organisationer kan
                          samverka för att förverkligar idéer och drömmar som medverkar till en långsiktigt hållbar
                          miljö- och samhällsutveckling.
                        </p>
                        <p className="mt-3 text-dark-slate/80">
                          GoodTribes är en ideell, opolitisk, oreligiös stiftelse som har som mål att hjälpa
                          människor och organisationer att göra världen bättre. GoodTribes vision är en
                          långsiktigt hållbar miljö- och samhällsutveckling, där alla människor ges möjlighet att
                          förverkliga sina idéer/drömmar, sin fulla potential och samtidigt Leva Gott, Må Gott och
                          Göra Gott för sig själv och andra.
                        </p>
                        <p className="mt-3 text-dark-slate/80">
                          Har du några minuter över för att göra världen bättre för dig och andra så{" "}
                          <Link href="/login" className="text-coral font-semibold hover:underline">
                            logga in
                          </Link>{" "}
                          och bli en del av GoodTribes community.
                        </p>
                      </>
                    ) : (
                      <>
                        <h1 className="text-3xl md:text-4xl font-bold text-dark-slate" style={{ textWrap: "balance" }}>
                          {current.heading}
                        </h1>
                        <p className="mt-4 text-dark-slate/80">{current.body}</p>
                        {current.obstacles && (
                          <ul className="mt-4 flex flex-col gap-2">
                            {current.obstacles.map((o) => (
                              <li key={o.lead} className="text-sm text-dark-slate/80">
                                <span className="font-bold text-seagrass">{o.lead}</span> {o.text}
                              </li>
                            ))}
                          </ul>
                        )}
                        {current.closing && (
                          <p className="mt-4 text-dark-slate/80">{current.closing}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Foto — till höger */}
            <div className="hidden md:flex items-center justify-self-center w-full" style={{ maxWidth: 620 }}>
              <div
                className="relative w-full min-w-0 transition-transform duration-500 ease-out"
                style={{
                  aspectRatio: "16 / 10",
                  transform: `rotate(${PHOTO_TILT[active].rotate}deg) translate(${PHOTO_TILT[active].x}px, ${PHOTO_TILT[active].y}px)`,
                }}
              >
                <div
                  key={current.src}
                  className={`hero-caption-in absolute inset-0 overflow-hidden bg-white p-3 ${CARD_SHADOW}`}
                >
                  <div className="relative h-full w-full overflow-hidden">
                    <Image src={current.src} alt={current.alt} fill unoptimized className="object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
