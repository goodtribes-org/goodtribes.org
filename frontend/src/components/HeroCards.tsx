"use client";

import Image from "next/image";

const CARDS = [
  {
    src: "/img/do-you-have-a-dream.png",
    alt: "Har du en dröm?",
    rotate: "-2.5deg",
    heading: "Har du en dröm?",
    body: "Oavsett hur stor eller liten din idé är — GoodTribes hjälper dig att förverkliga den.",
    bg: "from-sky-400 to-cyan-300",
  },
  {
    src: "/img/want-a-change.png",
    alt: "Vill du förändra?",
    rotate: "1.5deg",
    heading: "Vill du förändra?",
    body: "Hitta likasinnade och organisationer som vill göra världen lite bättre — tillsammans.",
    bg: "from-coral to-watermelon",
  },
  {
    src: "/img/want-to-be-a-winner.png",
    alt: "Vill du vinna?",
    rotate: "-1.5deg",
    heading: "Vill du bidra?",
    body: "Bidra med dina kompetenser och gör verklig skillnad i projekt som betyder något.",
    bg: "from-seagrass to-muted-teal",
  },
  {
    src: "/img/what-is-goodtribes.png",
    alt: "Vad är GoodTribes?",
    rotate: "2deg",
    heading: "Vad är GoodTribes?",
    body: "En plattform som kopplar ihop skickliga volontärer med samhällsdrivna organisationer.",
    bg: "from-dark-slate to-dark-slate/80",
  },
];

export default function HeroCards() {
  return (
    <>
      <style>{`
        .hero-flip:hover .hero-flip-inner {
          transform: rotateY(180deg);
        }
      `}</style>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          width: "820px",
          height: "460px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {CARDS.map(({ src, alt, rotate, heading, body, bg }) => (
          <div
            key={src}
            className="hero-flip"
            style={{
              perspective: "1000px",
              transform: `rotate(${rotate})`,
              cursor: "pointer",
            }}
          >
            <div
              className="hero-flip-inner"
              style={{
                width: "100%",
                height: "100%",
                position: "relative",
                transformStyle: "preserve-3d",
                transition: "transform 0.55s cubic-bezier(0.4,0.2,0.2,1)",
              }}
            >
              {/* Front */}
              <div
                className="bg-white overflow-hidden"
                style={{
                  position: "absolute",
                  inset: 0,
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  border: "12px solid white",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.45), 0 1px 6px rgba(0,0,0,0.25)",
                }}
              >
                <div className="relative w-full h-full">
                  <Image src={src} alt={alt} fill unoptimized className="object-cover" />
                </div>
              </div>

              {/* Back */}
              <div
                className={`bg-gradient-to-br ${bg} flex flex-col items-center justify-center p-5 text-center`}
                style={{
                  position: "absolute",
                  inset: 0,
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  border: "12px solid white",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.45), 0 1px 6px rgba(0,0,0,0.25)",
                }}
              >
                <p className="text-white font-bold text-lg mb-2 leading-tight">{heading}</p>
                <p className="text-white/85 text-sm leading-snug">{body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
