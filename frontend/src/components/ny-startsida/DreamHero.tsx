"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { startDreamFromHome } from "@/app/[locale]/ny-startsida/actions";
import { handwritingFontThin } from "@/lib/fonts";
import { newHomeDisplayFont } from "./fonts";

// Kept in sessionStorage across the login round trip, so a visitor who
// writes their dream before logging in finds it again afterwards. It never
// goes in the URL.
const DRAFT_KEY = "gt:new-home-dream";
const EXAMPLE_COUNT = 4;
const EXAMPLE_INTERVAL_MS = 3500;

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
    <section id="drom" className="relative px-4 pt-14 pb-16 sm:pt-20 overflow-hidden">
      <style>{`
        @keyframes nh-grow { from { transform: scale(.6) translateY(24px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes nh-sway { 0%, 100% { transform: rotate(-1.2deg); } 50% { transform: rotate(1.2deg); } }
        .nh-tree { animation: nh-grow .9s cubic-bezier(.2,.8,.2,1) both; transform-origin: 50% 100%; }
        .nh-tree > img { animation: nh-sway 7s ease-in-out 1s infinite; transform-origin: 50% 100%; display: block; }
        .nh-tree-right { animation-delay: .15s; }
        .nh-tree-right > img { animation-delay: 1.4s; }
        @media (prefers-reduced-motion: reduce) {
          .nh-tree, .nh-tree > img { animation: none; }
        }
      `}</style>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <p className={`${handwritingFontThin.className} text-2xl sm:text-3xl`} style={{ color: "var(--nh-accent)" }}>
          {t("overline")}
        </p>
        <h1
          className={`${newHomeDisplayFont.className} mt-3 font-extrabold tracking-tight text-[#1c1c1a]`}
          style={{ fontSize: "clamp(2.4rem, 6vw, 4.2rem)", lineHeight: 1.02, letterSpacing: "-0.035em" }}
        >
          {t("heading")}{" "}
          <span className="relative inline-block" style={{ color: "var(--nh-accent)" }}>
            {t("headingHighlight")}
            <svg aria-hidden viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute left-0 -bottom-1 w-full h-2.5">
              <path d="M2 8 C 50 2, 150 2, 198 7" fill="none" stroke="#f4b63f" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl xl:max-w-[30rem] text-lg leading-relaxed text-[#5b5b57]">{t("intro")}</p>
      </div>

      {/* Trees at their own size, with the trunks behind the ends of the box. */}
      <div className="relative mx-auto mt-4 max-w-[1080px]">
        <div aria-hidden className="nh-tree pointer-events-none absolute left-0 bottom-6 hidden lg:block" style={{ width: 319 }}>
          <img src="/img/sandbox-tree-left.png" alt="" width={319} height={312} />
        </div>
        <div aria-hidden className="nh-tree nh-tree-right pointer-events-none absolute right-0 bottom-6 hidden lg:block" style={{ width: 316 }}>
          <img src="/img/sandbox-tree-right.png" alt="" width={316} height={330} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="relative z-10 mx-auto mt-0 lg:mt-56 xl:mt-10 max-w-[640px] rounded-2xl border border-black/5 bg-white p-4 text-left shadow-[0_12px_40px_rgba(28,28,26,.12)]"
        >
          <label htmlFor="nh-dream" className="sr-only">
            {t("label")}
          </label>
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
            rows={3}
            maxLength={2000}
            placeholder={t(`examples.${example}`)}
            className="w-full resize-none border-0 bg-transparent p-1 text-base text-[#1c1c1a] placeholder:text-[#a3a39d] focus:outline-none focus:ring-0"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-[#8a8a84]">{restored ? t("restored") : t("note")}</p>
            <button
              type="submit"
              disabled={!text.trim() || pending}
              aria-label={t("submit")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
              style={{ background: "var(--nh-accent)" }}
            >
              <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
