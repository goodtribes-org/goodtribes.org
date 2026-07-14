"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type TourStep = {
  target: string; // matches a [data-tour="..."] attribute
  title: string;
  body: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 6;

export default function SpotlightTour({
  steps,
  onDismiss,
}: {
  steps: TourStep[];
  onDismiss: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);

  const step = steps[stepIndex];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!step) return;
    setRect(null);

    function measure() {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      return true;
    }

    // Target not found on this page (e.g. a different route) — skip this
    // step rather than showing a dangling callout with no highlight.
    if (!measure()) {
      if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
      else onDismiss();
      return;
    }

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
    // Deliberately keyed on primitives (target string, index, count) rather
    // than the steps/onDismiss references, which callers may pass inline.
  }, [step?.target, stepIndex, steps.length]);

  if (!mounted || !step || !rect) return null;

  const isLast = stepIndex === steps.length - 1;
  const calloutTop = rect.top + rect.height + 12;
  const calloutBelow = calloutTop + 160 < window.innerHeight;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Spotlight cutout — darkens everything except the target's rect */}
      <div
        className="absolute rounded-lg transition-all duration-200 pointer-events-none"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          boxShadow: "0 0 0 9999px rgba(20, 30, 28, 0.65)",
        }}
      />

      {/* Callout */}
      <div
        className="absolute bg-white rounded-xl shadow-2xl p-4 w-72 border border-muted-teal/30"
        style={{
          top: calloutBelow ? calloutTop : Math.max(12, rect.top - 12),
          left: Math.min(Math.max(rect.left, 12), window.innerWidth - 300),
          transform: calloutBelow ? undefined : "translateY(-100%)",
        }}
      >
        <p className="text-sm font-semibold text-dark-slate mb-1">{step.title}</p>
        <p className="text-xs text-dark-slate/60 leading-snug mb-4">{step.body}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === stepIndex ? "bg-seagrass w-4" : "bg-dark-slate/20"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs text-dark-slate/40 hover:text-dark-slate transition-colors"
            >
              Hoppa över
            </button>
            <button
              type="button"
              onClick={() => (isLast ? onDismiss() : setStepIndex((i) => i + 1))}
              className="px-3 py-1.5 rounded-lg bg-seagrass text-white text-xs font-semibold hover:bg-seagrass/90 transition-colors"
            >
              {isLast ? "Klart" : "Nästa"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
