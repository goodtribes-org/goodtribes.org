"use client";

import Image from "next/image";

const HERO_W = 820;
const HERO_H = 460;

const FACE_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

const BACK_FACE_STYLE: React.CSSProperties = {
  ...FACE_STYLE,
  transform: "rotateY(180deg)",
};

export default function HeroCards() {
  return (
    <>
      <style>{`
        /* Flip on hover.
           hero-lift  = outer wrapper
           hero-flip-inner = 3D flip target */
        .hero-lift {
          position: relative;
          z-index: 1;
          cursor: pointer;
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
        style={{ width: `${HERO_W}px`, height: `${HERO_H}px`, perspective: "1000px" }}
      >
        <div
          className="hero-flip-inner"
          style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}
        >
          <div className="bg-white" style={FACE_STYLE}>
            <div className="relative w-full h-full">
              <Image src="/img/Slide1.jpg" alt="GoodTribes — Crowdsourcing for Good" fill unoptimized className="object-contain" />
            </div>
          </div>
          <div
            className="bg-gradient-to-br from-seagrass to-muted-teal flex flex-col items-center justify-center p-6 text-center"
            style={BACK_FACE_STYLE}
          >
            <p className="text-white font-bold text-xl mb-2 leading-tight">GoodTribes</p>
            <p className="text-white/85 text-sm leading-snug">Crowdsourcing for good — gå med och gör skillnad!</p>
          </div>
        </div>
      </div>
    </>
  );
}
