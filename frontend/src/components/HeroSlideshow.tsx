"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const SLIDES = [
  { src: "/img/hero-banner.png", alt: "GoodTribes — gör dina idéer verklighet" },
  { src: "/img/hero-banner2.png", alt: "GoodTribes — samarbeta för förändring" },
];

export default function HeroSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative overflow-hidden"
      style={{ marginLeft: "calc(50% - 50vw)", width: "100vw", marginTop: 0 }}
    >
      {SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className="transition-opacity duration-700 absolute inset-0"
          style={{ opacity: i === current ? 1 : 0, position: i === 0 ? "relative" : "absolute" }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            width={1920}
            height={500}
            className="w-full object-cover"
            style={{ maxHeight: "400px" }}
            priority={i === 0}
          />
        </div>
      ))}

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/40"}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
