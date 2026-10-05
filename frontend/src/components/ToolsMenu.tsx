"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TOOLS, COLOR_HEX } from "@/lib/tools";

// Header tools menu (the 3×3 dot grid): every tool a project gets, as an
// overview. The tools themselves live inside each project, so the panel ends
// with two ways in — try them in the Sandbox, or start a project.
export default function ToolsMenu() {
  const t = useTranslations("HeaderTools");
  const tTools = useTranslations("HomePage.tools");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("tools")}
        aria-expanded={open}
        title={t("tools")}
        className="relative p-1 text-dark-slate/60 hover:text-dark-slate transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
          {[5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />))}
        </svg>
      </button>

      {open && (
        <div className="fixed left-4 right-4 top-16 md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-[26rem] bg-white border border-muted-teal/30 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-dark-slate">{t("toolsHeading")}</p>
            <p className="text-xs text-dark-slate/50">{t("toolsIntro")}</p>
          </div>
          <ul className="grid grid-cols-2 gap-1 px-2 pb-2 max-h-[60vh] overflow-y-auto">
            {TOOLS.map((tool) => (
              <li key={tool.key} className="flex items-start gap-2.5 rounded-lg px-2 py-2">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `color-mix(in oklab, ${COLOR_HEX[tool.color]} 12%, white)` }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLOR_HEX[tool.color]} strokeWidth={2} aria-hidden="true">
                    {tool.path}
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-dark-slate leading-tight">{tTools(`${tool.key}Label`)}</span>
                  <span className="block text-[11px] text-dark-slate/55 leading-snug line-clamp-2">{tTools(`${tool.key}Body`)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 border-t border-muted-teal/20 bg-[#FBFBF9] px-4 py-3">
            <Link href="/projects/new" onClick={() => setOpen(false)} className="flex-1 rounded-md bg-coral px-3 py-1.5 text-center text-sm font-medium text-white hover:bg-watermelon">
              {t("startProject")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
