"use client";

import Image from "next/image";

const HERO_W = 820;
const HERO_H = 460;

export default function HeroCards() {
  return (
    <div className="relative bg-white" style={{ width: `${HERO_W}px`, height: `${HERO_H}px` }}>
      <Image src="/img/Slide1.jpg" alt="GoodTribes — Crowdsourcing for Good" fill unoptimized className="object-contain" />
    </div>
  );
}
