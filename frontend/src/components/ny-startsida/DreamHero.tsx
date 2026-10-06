"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { heroTaglineFont } from "@/lib/fonts";
import { newHomeDisplayFont } from "./fonts";

// The dream box is the answer to Drömguiden's first question (#214): it is
// handed over in localStorage under this key (the guide reads and removes
// it) and the guide opens on question 2. It never goes in the URL.
const DRAFT_KEY = "gt:new-home-dream";
const EXAMPLE_COUNT = 4;

// Small per-word tilt (deg) and baseline shift (em) so the tagline reads as
// written by hand on paper rather than typeset in a straight line. Fixed
// values, not random, so server and client render the same thing.
const TAGLINE_WOBBLE: [number, number][] = [
  [-3, 0.02],
  [1.5, -0.04],
  [-1, 0.03],
  [2.5, -0.02],
  [-2, 0.05],
  [1, -0.03],
];
// One colour per word of the tagline, taken from the tree pictures' speech
// bubbles (blue thumb, red heart, green leaf) plus GoodTribes' orange and
// black: Vi · gör · goda · drömmar · verkliga. Extra words (the English
// "come true.") keep the last colour.
const TAGLINE_COLORS = ["var(--color-coral)", "#1a1a1a", "#ab0000", "#0000ab", "#005600"];
// Matches the placeholder's fade animation (nh-ph below), so each example
// fades in, stays and fades out once.
const EXAMPLE_INTERVAL_MS = 3200;

function Arrow({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

// A little idea-bulb-with-wings that rises up out of the trees, fading in
// and out as it goes (see nh-fly-up-a/b below) rather than orbiting in place.
function FlyingBulb({ style }: { style: React.CSSProperties }) {
  return (
    <svg width="36" height="34" viewBox="0 0 40 36" fill="none" style={style} aria-hidden>
      <path d="M15 15C8 8 -1 9 1 16c1.6 5.6 8 6.7 14 2.5" fill="#FFFFFF" fillOpacity="0.9" stroke="#F5B82E" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M25 15c7-7 16-6 14 1-1.6 5.6-8 6.7-14 2.5" fill="#FFFFFF" fillOpacity="0.9" stroke="#F5B82E" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M20 6a7.5 7.5 0 00-4.3 13.6c.5.35.7.9.7 1.4v.6h7.2v-.6c0-.5.2-1.05.7-1.4A7.5 7.5 0 0020 6z" fill="#FCEFC7" stroke="#E8531F" strokeWidth="1.8" />
      <path d="M17 23.6h6M17.7 26h4.6" stroke="#8A918D" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17.8 13l2.2 3.4 2.2-3.4" stroke="#E8531F" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function DreamHero() {
  const t = useTranslations("NewHomePage.hero");
  const [text, setText] = useState("");
  const [example, setExample] = useState(0);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (text) return;
    const id = setInterval(() => setExample((i) => (i + 1) % EXAMPLE_COUNT), EXAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [text]);

  function submit() {
    const dream = text.trim();
    if (!dream || pending) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ text: dream, at: Date.now() }));
    } catch {}
    startTransition(() => router.push("/projects/new"));
  }

  return (
    <section id="drom" className="relative flex flex-col items-center gap-[26px] overflow-x-clip overflow-y-visible px-4 pt-12 pb-12 text-center xl:pt-20">
      <style>{`
        @keyframes nh-grow { 0% { transform: scale(0); } 100% { transform: scale(1); } }
        @keyframes nh-ph { 0% { opacity: 0; transform: translateY(6px); } 12% { opacity: 1; transform: none; } 88% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes nh-fly-up-a {
          0%   { transform: translate(0, 0) rotate(-8deg) scale(0.5); opacity: 0; }
          10%  { opacity: 1; }
          50%  { transform: translate(24px, -230px) rotate(6deg) scale(1.05); opacity: 1; }
          88%  { opacity: 0.4; }
          100% { transform: translate(-12px, -460px) rotate(-4deg) scale(1.6); opacity: 0; }
        }
        @keyframes nh-fly-up-b {
          0%   { transform: translate(0, 0) rotate(8deg) scale(0.5); opacity: 0; }
          10%  { opacity: 1; }
          50%  { transform: translate(-24px, -240px) rotate(-6deg) scale(1.05); opacity: 1; }
          88%  { opacity: 0.4; }
          100% { transform: translate(12px, -470px) rotate(4deg) scale(1.6); opacity: 0; }
        }
        @keyframes nh-write { 0% { clip-path: inset(-30% 100% -30% -5%); } 100% { clip-path: inset(-30% -5% -30% -5%); } }
        .nh-grow { transform-origin: 47% 100%; }
        @media (prefers-reduced-motion: no-preference) {
          .nh-grow { animation: nh-grow 1.4s cubic-bezier(0.34, 1.4, 0.64, 1) both; }
          .nh-write { animation: nh-write 1.6s cubic-bezier(0.45, 0.05, 0.35, 1) 0.2s both; }
          .nh-ph { animation: nh-ph 3.2s ease-in-out infinite; }
          .nh-fly-up-a { animation: nh-fly-up-a 14s ease-in-out infinite; }
          .nh-fly-up-b { animation: nh-fly-up-b 16s ease-in-out infinite; }
        }
      `}</style>

      <p
        className={`${heroTaglineFont.className} nh-write relative text-[32px] leading-none sm:text-[40px]`}
        style={{ color: "var(--color-navy)", fontWeight: 400, transform: "rotate(-2deg)" }}
      >
        {/* A colour per word (TAGLINE_COLORS) and no underline, so the
            heading's "förändra?" stays the one underlined accent. Each word gets its
            own small tilt and baseline shift, the whole line leans slightly
            uphill and is "written" in left to right, so it feels handwritten.
            The message's <u> marker is stripped here — an underline is easy
            to bring back. */}
        {t
          .raw("overline")
          .replace(/<\/?u>/g, "")
          .split(" ")
          .map((word: string, i: number, words: string[]) => {
            const [deg, dy] = TAGLINE_WOBBLE[i % TAGLINE_WOBBLE.length];
            return (
              <span key={i}>
                <span
                  className="inline-block"
                  style={{
                    transform: `translateY(${dy}em) rotate(${deg}deg)`,
                    color: TAGLINE_COLORS[Math.min(i, TAGLINE_COLORS.length - 1)],
                  }}
                >
                  {word}
                </span>
                {i < words.length - 1 && " "}
              </span>
            );
          })}
      </p>
      <h1
        className={`${newHomeDisplayFont.className} relative m-0 max-w-[900px] font-extrabold`}
        style={{ fontSize: "clamp(2.6rem, 6.4vw, 84px)", lineHeight: 1.02, letterSpacing: "-0.035em" }}
      >
        {t("heading")}{" "}
        <span className="relative inline-block isolate" style={{ color: "var(--nh-accent)" }}>
          <span className="relative z-[1]">{t("headingHighlight")}</span>
          {/* Same hand-drawn double brush stroke as the footer's tagline, in yellow */}
          <svg viewBox="0 0 200 20" preserveAspectRatio="none" fill="none" aria-hidden className="pointer-events-none absolute left-[-3%] z-0 w-[106%]" style={{ bottom: "-0.26em", height: "0.4em" }}>
            <path d="M3 13 C 40 9.5, 90 7, 140 7.5 C 165 7.8, 185 9, 197 10.5" stroke="#F5B82E" strokeWidth="5" strokeLinecap="round" />
            <path d="M18 15.5 C 70 11.5, 130 10.5, 186 12.5" stroke="#F5B82E" strokeWidth="2.6" strokeLinecap="round" opacity="0.75" />
          </svg>
        </span>
      </h1>
      <p className="relative z-[2] m-0 max-w-[520px] text-lg leading-[1.55] text-[#4A514D] sm:text-[21px]">{t("intro")}</p>

      <div className="relative mt-8 w-full max-w-[960px] sm:mt-20 xl:mt-2">
        {/* On wide screens the whole text block sits low, with the intro
            between the tree crowns just above the box (xl:pt / xl:-mt).
            The trees at their own size above the ends of the box, trunks
            tucked behind it. Only where there is room for them beside the
            intro text, which sits between them; they grow in on load (off
            under prefers-reduced-motion) and then stand still. */}
        <div aria-hidden className="nh-grow pointer-events-none absolute z-0 hidden xl:block" style={{ bottom: "calc(100% - 40px)", left: -105, width: 319, height: 312 }}>
          <img className="block" src="/img/sandbox-tree-left.png" alt="" width={319} height={312} />
        </div>
        <div aria-hidden className="nh-grow pointer-events-none absolute z-0 hidden xl:block" style={{ bottom: "calc(100% - 44px)", left: 780, width: 316, height: 330 }}>
          <img className="block" src="/img/sandbox-tree-right.png" alt="" width={316} height={330} />
        </div>

        {/* A few idea-bulbs with wings, rising up out of the tree crowns. */}
        <div aria-hidden className="nh-fly-up-a pointer-events-none absolute z-0 hidden xl:block" style={{ bottom: "calc(100% + 175px)", left: -40 }}>
          <FlyingBulb style={{}} />
        </div>
        <div aria-hidden className="nh-fly-up-b pointer-events-none absolute z-0 hidden xl:block" style={{ bottom: "calc(100% + 140px)", left: 60, animationDelay: "-3s" }}>
          <FlyingBulb style={{}} />
        </div>
        <div aria-hidden className="nh-fly-up-b pointer-events-none absolute z-0 hidden xl:block" style={{ bottom: "calc(100% + 180px)", left: 1010, animationDelay: "-1.5s" }}>
          <FlyingBulb style={{}} />
        </div>
        <div aria-hidden className="nh-fly-up-a pointer-events-none absolute z-0 hidden xl:block" style={{ bottom: "calc(100% + 145px)", left: 900, animationDelay: "-5s" }}>
          <FlyingBulb style={{}} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="relative z-[1] flex flex-col gap-2.5 rounded-[26px] border border-[#E4E4DF] bg-white text-left"
          style={{ padding: "18px 18px 14px 22px", boxShadow: "0 10px 30px rgba(27,31,29,0.08)" }}
        >
          <label htmlFor="nh-dream" className="sr-only">
            {t("label")}
          </label>
          <div className="relative h-[84px]">
            <textarea
              id="nh-dream"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              maxLength={2000}
              className="absolute inset-0 h-[84px] w-full resize-none border-0 bg-transparent py-1.5 text-[17px] leading-normal text-[#1B1F1D] outline-none focus:ring-0 sm:text-[19px]"
            />
            {!text && (
              <div key={example} aria-hidden className="nh-ph pointer-events-none absolute left-0 top-1.5 text-[17px] leading-normal text-[#8A918D] sm:text-[19px]">
                {t(`examples.${example}`)}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-[#6B726E] sm:text-sm">{t("note")}</p>
            <button
              type="submit"
              disabled={!text.trim() || pending}
              aria-label={t("submit")}
              className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 text-white transition-opacity disabled:cursor-default disabled:opacity-50"
              style={{ background: "var(--nh-accent)" }}
            >
              <Arrow size={22} />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
