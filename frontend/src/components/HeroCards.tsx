"use client";

import Image from "next/image";

const HERO_W = 820;
const HERO_H = 460;

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
           hero-flip-inner = 3D flip target */
        .hero-lift {
          transition: transform 0.2s ease, filter 0.2s ease;
          position: relative;
          z-index: 1;
        }
        .hero-lift:hover {
          transform: scale(1.06) translateY(-6px);
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

      {/* GoodTribes card */}
      <div
        className="hero-lift"
        style={{ width: `${HERO_W}px`, height: `${HERO_H}px`, perspective: "1000px", cursor: "pointer" }}
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
    </>
  );
}
