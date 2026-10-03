"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import StepCards, { type StepCard } from "./StepCards";

export type PhaseStep = {
  key: string;
  label: string;
  anchor: string;
  status: "done" | "review" | "started" | "empty";
};

// Focus on one step of the phase page at a time. The stepper itself is the
// phase bar in the header (PhaseMenuBar): each Idé step is a link to
// ?step=<key>, and the step in focus is framed there. This component shows
// that step's section(s) and puts ‹ › arrows, with the step they lead to,
// either side of the section's title (portalled into the title row's
// [data-nav] slots, SectionIntro.tsx), keeping ?step= in the URL so the
// header follows. Nothing under the step: the arrows and the header's bar
// are the navigation. "Visa allt" (?view=all) shows the
// whole page. Sections are found by [data-step] on the page's direct
// children; [data-keep] always shows, [data-overview] only in "Visa allt".
export default function PhaseSteps({
  steps,
  initialView,
  slug,
  cardsByStep,
  canEdit,
}: {
  steps: PhaseStep[];
  initialView: "all" | "steps";
  slug: string;
  cardsByStep: Record<string, StepCard[]>;
  canEdit: boolean;
}) {
  const t = useTranslations("PhaseSteps");
  const searchParams = useSearchParams();
  const [view, setView] = useState(initialView);
  const firstOpen = useMemo(() => Math.max(0, steps.findIndex((s) => s.status !== "done")), [steps]);
  const fromUrl = steps.findIndex((s) => s.key === searchParams.get("step"));
  const current = fromUrl >= 0 ? fromUrl : firstOpen;
  const step = steps[current];

  // Show only the step in focus.
  useEffect(() => {
    const page = document.querySelector<HTMLElement>("[data-phase-page]");
    if (!page) return;
    // Lets the page's CSS hide what only makes sense with every section
    // shown ("Fäll ihop").
    page.dataset.view = view;
    for (const child of Array.from(page.children) as HTMLElement[]) {
      if (child.hasAttribute("data-keep")) continue;
      const hide = view === "steps" && (child.hasAttribute("data-overview") || child.getAttribute("data-step") !== step?.key);
      child.style.display = hide ? "none" : "";
    }
    if (view === "steps" && step) {
      // Opens a folded section: CollapsibleSection listens for hashchange,
      // which pushState (go) doesn't fire, so announce it ourselves.
      if (window.location.hash !== `#${step.anchor}`) window.history.replaceState(null, "", `#${step.anchor}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      window.scrollTo({ top: 0 });
    }
  }, [view, step]);

  // Line the page up with the phase menu in the header: ordinary steps span
  // exactly from "Idé" to "Impact"; the wide canvases centre under the menu
  // and use what room there is. Measured, because the menu's place depends on
  // the logo and the icons beside it. Only where the header menu shows (lg+).
  useEffect(() => {
    const page = document.querySelector<HTMLElement>("[data-phase-page]");
    if (!page) return;
    const align = () => {
      const nav = document.querySelector<HTMLElement>("[data-phase-nav]");
      const n = nav?.getBoundingClientRect();
      if (!n || n.width === 0) {
        delete page.dataset.aligned;
        return;
      }
      const p = page.getBoundingClientRect();
      const left = n.left - p.left;
      const center = left + n.width / 2;
      const room = Math.min(center, p.width - center) * 2;
      const wide = Math.min(room, 1760);
      page.style.setProperty("--align-left", `${left}px`);
      page.style.setProperty("--align-width", `${n.width}px`);
      page.style.setProperty("--wide-left", `${center - wide / 2}px`);
      page.style.setProperty("--wide-width", `${wide}px`);
      page.dataset.aligned = "";
    };
    align();
    const ro = new ResizeObserver(align);
    ro.observe(page);
    const nav = document.querySelector("[data-phase-nav]");
    if (nav) ro.observe(nav);
    window.addEventListener("resize", align);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", align);
    };
  }, []);

  // The current section's title-row slots for the arrows, found after the
  // section is shown (it may have just been unfolded by the hash).
  const [slots, setSlots] = useState<{ prev: Element; next: Element; cards: Element | null } | null>(null);
  useEffect(() => {
    if (view !== "steps" || !step) {
      setSlots(null);
      return;
    }
    const find = () => {
      const section = document.querySelector(`[data-phase-page] > [data-step="${step.key}"]`);
      const prev = section?.querySelector('[data-nav="prev"]');
      const next = section?.querySelector('[data-nav="next"]');
      setSlots(prev && next ? { prev, next, cards: section?.querySelector('[data-nav="cards"]') ?? null } : null);
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(find));
    return () => cancelAnimationFrame(id);
  }, [view, step]);

  // Keep ?step= in the URL so the header's bar frames the same step.
  const go = (i: number) => {
    const next = steps[Math.min(Math.max(i, 0), steps.length - 1)];
    setView("steps");
    window.history.pushState(null, "", `?step=${next.key}#${next.anchor}`);
  };

  if (view === "all") {
    return (
      <div data-keep className="flex justify-center">
        <button type="button" onClick={() => go(current)} className="text-sm font-medium text-dark-slate/60 hover:text-dark-slate">
          {t("oneAtATime")}
        </button>
      </div>
    );
  }

  const prevStep = current > 0 ? steps[current - 1] : null;
  const nextStep = current < steps.length - 1 ? steps[current + 1] : null;
  // ‹ › with the step they lead to written out small beside them (hidden on
  // narrow screens, where the title needs the room). No label at the ends.
  const arrow = (target: PhaseStep | null, dir: "prev" | "next") => {
    // Numbered, so the step in focus gets its number from its neighbours.
    const numberedLabel = target ? `${steps.indexOf(target) + 1}. ${target.label}` : "";
    const label = target ? t(dir === "prev" ? "prevTo" : "nextTo", { step: numberedLabel }) : undefined;
    const name = target && (
      <span className="hidden max-w-[12rem] truncate text-xs font-medium text-dark-slate/50 group-hover:text-dark-slate sm:inline">{numberedLabel}</span>
    );
    return (
      <button
        type="button"
        disabled={!target}
        onClick={() => go(current + (dir === "prev" ? -1 : 1))}
        title={label}
        aria-label={label}
        className="group flex shrink-0 items-center gap-1 rounded-full px-1.5 disabled:pointer-events-none disabled:opacity-20"
      >
        {dir === "prev" && name}
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-full text-3xl leading-none text-dark-slate/50 group-hover:bg-dry-sage/30 group-hover:text-dark-slate"
        >
          {dir === "prev" ? "‹" : "›"}
        </span>
        {dir === "next" && name}
      </button>
    );
  };

  return (
    <>
      {slots && createPortal(arrow(prevStep, "prev"), slots.prev)}
      {slots && createPortal(arrow(nextStep, "next"), slots.next)}
      {slots?.cards && step && step.key !== "gate" &&
        createPortal(<StepCards slug={slug} stepKey={step.key} cards={cardsByStep[step.key] ?? []} canEdit={canEdit} />, slots.cards)}
    </>
  );
}
