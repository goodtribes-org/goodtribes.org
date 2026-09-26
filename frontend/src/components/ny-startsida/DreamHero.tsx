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
        .nh-grow { transform-origin: 47% 100%; }
        @media (prefers-reduced-motion: no-preference) {
          .nh-grow { animation: nh-grow 1.4s cubic-bezier(0.34, 1.4, 0.64, 1) both; }
          .nh-ph { animation: nh-ph 3.2s ease-in-out infinite; }
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
        <div aria-hidden className="nh-grow pointer-events-none absolute z-0 hidden xl:block" style={{ bottom: "calc(100% - 48px)", left: -105, width: 319, height: 312 }}>
          <img className="block" src="/img/sandbox-tree-left.png" alt="" width={319} height={312} />
        </div>
        <div aria-hidden className="nh-grow pointer-events-none absolute z-0 hidden xl:block" style={{ bottom: "calc(100% - 60px)", left: 780, width: 316, height: 330 }}>
          <img className="block" src="/img/sandbox-tree-right.png" alt="" width={316} height={330} />
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
