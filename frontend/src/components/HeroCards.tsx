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
    zIndex: 3,
  },
  {
    src: "/img/want-a-change.png",
    alt: "Vill du förändra?",
    rotate: "1.5deg",
    heading: "Vill du förändra?",
    body: "Hitta likasinnade och organisationer som vill göra världen lite bättre — tillsammans.",
    bg: "from-coral to-watermelon",
    zIndex: 2,
    offsetX: "-8px",
    offsetY: "8px",
  },
  {
    src: "/img/what-is-goodtribes.png",
    alt: "Vad är GoodTribes?",
    rotate: "1.5deg",
    heading: "Vad är GoodTribes?",
    body: "En plattform som kopplar ihop skickliga volontärer med samhällsdrivna organisationer.",
    bg: "from-dark-slate to-dark-slate",
    zIndex: 2,
    offsetX: "8px",
  },
  {
    src: "/img/want-to-be-a-winner.png",
    alt: "Vill du vinna?",
    rotate: "-2deg",
    heading: "Vill du bidra?",
    body: "Bidra med dina kompetenser och gör verklig skillnad i projekt som betyder något.",
    bg: "from-seagrass to-muted-teal",
    zIndex: 1,
  },
];

const CARD_W = 820;
const CARD_H = 460;
const GRID_W = 820;
const GRID_H = 460;

const FACE_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  border: "12px solid white",
  boxShadow: "0 4px 20px rgba(0,0,0,0.45), 0 1px 6px rgba(0,0,0,0.25)",
};

const BACK_FACE_STYLE: React.CSSProperties = {
  ...FACE_STYLE,
  transform: "rotateY(180deg)",
};

export default function HeroCards() {
  return (
    <>
      <style>{`
        /* Lift + flip on hover.
           hero-lift  = outer wrapper (scale + z-index)
           hero-flip  = rotation wrapper (keeps tilt)
           hero-flip-inner = 3D flip target */
        .hero-lift {
          transition: transform 0.2s ease, filter 0.2s ease;
          position: relative;
          z-index: 1;
        }
        .hero-lift:hover {
          transform: scale(1.1) translateY(-8px);
          z-index: 20;
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.55));
        }
        .hero-flip-inner {
          transition: transform 0.55s cubic-bezier(0.4,0.2,0.2,1);
        }
        .hero-lift:hover .hero-flip-inner {
          transform: rotateY(180deg);
        }
      `}</style>

      <div style={{ position: "relative", width: `${GRID_W}px`, height: `${GRID_H}px`, zIndex: 1 }}>

        {/* 2×2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "12px", width: "100%", height: "100%" }}>
          {CARDS.map(({ src, alt, rotate, heading, body, bg, zIndex, offsetX, offsetY }) => (
            <div
              key={src}
              style={{ position: "relative", zIndex, width: "100%", height: "100%", transform: (offsetX || offsetY) ? `translateX(${offsetX ?? "0px"}) translateY(${offsetY ?? "0px"})` : undefined }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.zIndex = "20"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.zIndex = String(zIndex); }}
            >
            <div
              className="hero-lift"
              style={{ perspective: "1000px", cursor: "pointer", width: "100%", height: "100%" }}
            >
              {/* Rotation wrapper — separate from lift so transforms don't conflict */}
              <div style={{ width: "100%", height: "100%", transform: `rotate(${rotate})` }}>
                <div
                  className="hero-flip-inner"
                  style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}
                >
                  <div className="bg-white overflow-hidden" style={FACE_STYLE}>
                    <div className="relative w-full h-full">
                      <Image src={src} alt={alt} fill unoptimized className="object-cover" />
                    </div>
                  </div>
                  <div
                    className={`bg-gradient-to-br ${bg} flex flex-col items-center justify-center p-5 text-center`}
                    style={BACK_FACE_STYLE}
                  >
                    <p className="text-white font-bold text-lg mb-2 leading-tight">{heading}</p>
                    <p className="text-white/85 text-sm leading-snug">{body}</p>
                  </div>
                </div>
              </div>
            </div>
            </div>
          ))}
        </div>

        {/* 5th card — centered on top */}
        <div
          className="hero-lift"
          style={{
            position: "absolute",
            left: `${(GRID_W - CARD_W) / 2}px`,
            top: `${(GRID_H - CARD_H) / 2}px`,
            width: `${CARD_W}px`,
            height: `${CARD_H}px`,
            perspective: "1000px",
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          <div style={{ width: "100%", height: "100%", transform: "rotate(1.5deg)" }}>
            <div
              className="hero-flip-inner"
              style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}
            >
              <div
                className="bg-white"
                style={{
                  position: "absolute",
                  inset: 0,
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.12)",
                  padding: "12px",
                }}
              >
                <div className="relative w-full h-full" style={{ border: "1px solid rgba(0,0,0,0.12)" }}>
                  <Image src="/img/Slide1.jpg" alt="GoodTribes — Crowdsourcing for Good" fill unoptimized className="object-contain" />
                </div>
              </div>
              <div
                className="bg-gradient-to-br from-seagrass to-muted-teal flex flex-col items-center justify-center p-6 text-center"
                style={{ ...BACK_FACE_STYLE, boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3)" }}
              >
                <p className="text-white font-bold text-xl mb-2 leading-tight">GoodTribes</p>
                <p className="text-white/85 text-sm leading-snug">Crowdsourcing for good — gå med och gör skillnad!</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
