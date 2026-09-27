"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { startDreamFromHome } from "@/app/[locale]/ny-startsida/actions";
import { newHomeDisplayFont, newHomeScriptFont } from "./fonts";

// Kept in sessionStorage across the login round trip, so a visitor who
// writes their dream before logging in finds it again afterwards. It never
// goes in the URL.
const DRAFT_KEY = "gt:new-home-dream";
const EXAMPLE_COUNT = 4;
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

export default function DreamHero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useTranslations("NewHomePage.hero");
  const [text, setText] = useState("");
  const [example, setExample] = useState(0);
  const [restored, setRestored] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const draft = sessionStorage.getItem(DRAFT_KEY);
      if (draft) {
        setText(draft);
        setRestored(true);
      }
    } catch {
      // Storage blocked: the visitor simply types again.
    }
  }, []);

  useEffect(() => {
    if (text) return;
    const id = setInterval(() => setExample((i) => (i + 1) % EXAMPLE_COUNT), EXAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [text]);

  function submit() {
    const dream = text.trim();
    if (!dream || pending) return;
    try {
      if (isLoggedIn) sessionStorage.removeItem(DRAFT_KEY);
      else sessionStorage.setItem(DRAFT_KEY, dream);
    } catch {}
    startTransition(async () => {
      await startDreamFromHome(dream);
    });
  }

  return (
    <section id="drom" className="relative flex flex-col items-center gap-[26px] overflow-hidden px-4 pt-12 pb-12 text-center xl:pt-20">
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
        .nh-grow { transform-origin: 47% 100%; }
        @media (prefers-reduced-motion: no-preference) {
          .nh-grow { animation: nh-grow 1.4s cubic-bezier(0.34, 1.4, 0.64, 1) both; }
          .nh-ph { animation: nh-ph 3.2s ease-in-out infinite; }
          .nh-fly-up-a { animation: nh-fly-up-a 14s ease-in-out infinite; }
          .nh-fly-up-b { animation: nh-fly-up-b 16s ease-in-out infinite; }
        }
      `}</style>

      <p className={`${newHomeScriptFont.className} relative text-[32px] leading-none sm:text-[40px]`} style={{ color: "#C2410C" }}>
        {t("overline")}
      </p>
      <h1
        className={`${newHomeDisplayFont.className} relative m-0 max-w-[900px] font-extrabold`}
        style={{ fontSize: "clamp(2.6rem, 6.4vw, 84px)", lineHeight: 1.02, letterSpacing: "-0.035em" }}
      >
        {t("heading")}{" "}
        <span className="relative inline-block" style={{ color: "var(--nh-accent)" }}>
          {t("headingHighlight")}
          <svg width="100%" height="22" viewBox="0 0 300 22" preserveAspectRatio="none" fill="none" aria-hidden className="absolute left-0" style={{ bottom: -14 }}>
            <path d="M4 14 C 80 4, 200 4, 296 12" stroke="#F5B82E" strokeWidth="7" strokeLinecap="round" />
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
              onChange={(e) => {
                setText(e.target.value);
                setRestored(false);
              }}
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
            <p className="text-[13px] text-[#6B726E] sm:text-sm">{restored ? t("restored") : t("note")}</p>
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
