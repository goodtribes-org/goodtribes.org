"use client";

import type React from "react";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { toggleChecklistItem } from "./(workspace)/edit/actions";
import { DISPLAY_PHASES, toDisplayPhase, getChecklistForPhase, numberChecklist, overviewPathFor, PHASE_COLORS, hexToRgba, type ProjectPhaseValue } from "@/lib/projectPhase";
import { isPhaseFinished, nextStep, phaseStepProgress, type PhaseStep } from "@/lib/phaseProgress";
import type { PhaseCardCount } from "@/lib/phaseWork";
import { activePhaseFor } from "@/lib/phaseForPath";
import { usePathname } from "@/i18n/navigation";
import { ChevronDown } from "lucide-react";
import { newHomeDisplayFont } from "@/components/ny-startsida/fonts";

interface Props {
  slug: string;
  phase: ProjectPhaseValue;
  // Ticked by a human (InitiativeChecklistItem).
  completedKeys: string[];
  // Shown as done because the project's own data says so (lib/projectSignals.ts
  // — "3 intervjuer loggade"); can't be unticked, since it isn't a tick.
  autoDoneKeys?: string[];
  // Per phase, its kanban cards done/total (lib/phaseWork.ts): drawn as the
  // header bar's outline, and a phase only counts as finished once they're done.
  cardCounts?: Partial<Record<string, PhaseCardCount>>;
  canEdit: boolean;
  // Set on guide pages so the pill for the guide being read gets a ring —
  // independent of `phase` (the project's actual current phase, still shown
  // via the solid fill), since a guide can be opened for any phase.
  viewingPhase?: ProjectPhaseValue;
  // Link each phase's dropdown to its one-page overview (flag
  // ai-project-start is on for this viewer).
  showOverviews?: boolean;
  // "Nästa steg: …" under the bars — for members, not for every visitor.
  showNextStep?: boolean;
  // Thin variant for the top of the phase overview pages: no checklist
  // dropdowns, each phase links straight to its overview.
  compact?: boolean;
  // PROTOTYPE: "chevrons" = förslag D, the phases as arrows in the header.
  // "header" = förslag från startsidans design: stapel överst, inget
  // nummer, fasnamnet följt av ▾ som fäller ut fasens arbetsuppgifter.
  variant?: "bars" | "chevrons" | "header";
}

// Header look (Niklas's choice, 2026-09-30): homepage style — full-colour bars
// with a thin white progress line, filled circles with white numbers, and a
// ring only on the phase being worked in. Note: white on the
// yellow/orange fills is below WCAG's 4.5:1 for small text (1.8–2.8:1), so
// the circles rely on colour + position more than on reading the digit.
const guideHref = (slug: string, phase: ProjectPhaseValue, step?: string) =>
  (phase === "IDEA" ? `/projects/${slug}/guide` : `/projects/${slug}/guide/${phase.toLowerCase()}`) + (step ? `?step=${step}` : "");

// Fasstaplarna (docs/plans/fasframsteg-och-overblick.md): sex kolumner —
// stapel, numrerad cirkel, fasnamn — i fasens färg (PHASE_COLORS, gult →
// grönt). Stapeln fylls i takt med att fasens uppgifter blir klara (ibockade
// eller automatiskt klara), numret blir en bock när fasen är klar. Idé
// täcker både IDEA och SPRINT (lib/projectPhase.ts). Klick på en fas fäller
// ut dess checklista ("1.1 Beskriv projektet", …) som förut.
export default function PhaseMenuBar({ slug, phase, completedKeys, autoDoneKeys = [], cardCounts, canEdit, viewingPhase, showOverviews, showNextStep, compact, variant = "bars" }: Props) {
  const t = useTranslations("PhaseMenuBar");
  const tPhase = useTranslations("ProjectPhase");
  const tChecklist = useTranslations("ProjectPhaseChecklist");
  const [ticked, setTicked] = useState<Set<string>>(new Set(completedKeys));
  const [isPending, startTransition] = useTransition();
  const [openPhase, setOpenPhase] = useState<ProjectPhaseValue | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // The header variant's dropdown is portalled out of the header.
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);
  // Unique clipPath ids when several arrow strips are on one page.
  const idPrefix = useId().replace(/:/g, "");

  // Guide pages render their own step UI alongside this menu — when a step
  // gets marked done there, the server action revalidates this route too,
  // so pick up the fresh completedKeys instead of staying stuck on the set
  // this component first mounted with.
  useEffect(() => {
    setTicked(new Set(completedKeys));
  }, [completedKeys]);

  const auto = useMemo(() => new Set(autoDoneKeys), [autoDoneKeys]);
  const doneKeys = useMemo(() => new Set([...ticked, ...auto]), [ticked, auto]);
  // Counted in steps: each bar is one segment per main step (phaseSteps).
  const progress = phaseStepProgress(doneKeys);
  const currentIndex = DISPLAY_PHASES.findIndex((p) => p.value === toDisplayPhase(phase));
  // In the header the active phase follows the page: working in a tool of
  // another phase (e.g. Designsprints → Uppstart) makes that phase active;
  // pages outside any phase keep the project's own phase active.
  const pathname = usePathname();
  const activeIndex =
    variant === "header" ? DISPLAY_PHASES.findIndex((p) => p.value === activePhaseFor(pathname, slug, phase)) : currentIndex;
  const viewingDisplayPhase = viewingPhase ? toDisplayPhase(viewingPhase) : null;
  const next = showNextStep ? nextStep(phase, doneKeys) : null;
  const phaseDone = (i: number) => isPhaseFinished(progress[i], cardCounts?.[progress[i].phase]);
  const stepTitle = (s: PhaseStep) =>
    `${tChecklist(s.key)}${s.subTotal ? ` — ${t("subStepsLabel", { done: s.subDone, total: s.subTotal })}` : ""}${s.done ? " ✓" : ""}`;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpenPhase(null);
    }
    if (openPhase) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openPhase]);

  function handleToggle(p: ProjectPhaseValue, itemKey: string, done: boolean) {
    if (!canEdit || auto.has(itemKey)) return;
    setTicked((prev) => {
      const nextSet = new Set(prev);
      if (done) nextSet.add(itemKey);
      else nextSet.delete(itemKey);
      return nextSet;
    });
    startTransition(() => toggleChecklistItem(slug, p, itemKey, done));
  }

  if (variant === "chevrons") {
    // Förslag D: one arrow per phase, overlapping so they read as a single
    // journey. The arrow fills with the phase colour as its tasks get done
    // (same progress as the bars); the current phase is bold and shows
    // "3/7"; a finished phase gets ✓. Each arrow links to its overview.
    return (
      <nav aria-label={t("navLabel")} className="flex w-full items-stretch">
        {DISPLAY_PHASES.map((p, i) => {
          const pr = progress[i];
          const color = PHASE_COLORS[p.value];
          const isCurrent = i === currentIndex;
          const first = i === 0;
          const last = i === DISPLAY_PHASES.length - 1;
          // Drawn as SVG so the arrow can have an outline in its phase
          // colour (a CSS border can't follow a clip-path). viewBox width
          // 100, stretched to the arrow's width; the stroke stays 1.5px
          // (non-scaling), the 9-unit notch reads as ~9px at header sizes.
          const n = 9;
          const shape = first
            ? `M0.75,1 H${100 - n} L99.25,14 L${100 - n},27 H0.75 Z`
            : last
              ? `M0.75,1 H99.25 V27 H0.75 L${n},14 Z`
              : `M0.75,1 H${100 - n} L99.25,14 L${100 - n},27 H0.75 L${n},14 Z`;
          const clipId = `${idPrefix}-phase-${i}`;
          return (
            <a
              key={p.value}
              href={`/projects/${slug}/${overviewPathFor(p.value)}`}
              aria-current={isCurrent ? "step" : undefined}
              title={t("progressLabel", { done: pr.done, total: pr.total })}
              className={`relative flex h-7 min-w-0 flex-1 items-center justify-center transition-opacity hover:opacity-85 ${first ? "" : "-ml-1.5"}`}
            >
              <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 100 28" preserveAspectRatio="none">
                <defs>
                  <clipPath id={clipId}>
                    <path d={shape} />
                  </clipPath>
                </defs>
                <path d={shape} fill={hexToRgba(color, isCurrent ? 0.22 : 0.1)} />
                <rect x="0" y="0" width={pr.pct} height="28" fill={color} clipPath={`url(#${clipId})`} className="transition-[width] duration-500" />
                <path d={shape} fill="none" stroke={color} strokeWidth={isCurrent ? 2 : 1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
              <span className={`relative truncate px-3 text-xs ${isCurrent ? "font-bold text-dark-slate" : pr.done > 0 ? "font-semibold text-dark-slate/80" : "font-medium text-dark-slate/55"}`}>
                {phaseDone(i) ? "✓ " : ""}
                {tPhase(p.value)}
                {isCurrent && !phaseDone(i) ? ` ${pr.done}/${pr.total}` : ""}
              </span>
              <span className="sr-only">{t("progressLabel", { done: pr.done, total: pr.total })}</span>
            </a>
          );
        })}
      </nav>
    );
  }

  return (
    <div ref={menuRef}>
      <nav
        aria-label={t("navLabel")}
        className={`grid ${
          variant === "header"
            ? // Header only (lg+): own column rule, without sm:grid-cols-6,
              // whose media query would otherwise override it.
              "gap-x-2.5 gap-y-3 [grid-template-columns:var(--phase-cols)] min-[1500px]:[grid-template-columns:var(--phase-cols-wide)]"
            : `grid-cols-3 sm:grid-cols-6 ${compact ? "gap-x-2 gap-y-3" : "gap-x-3 gap-y-5"}`
        }`}
        // In the header, below ~1500px only the current phase shows its name
        // and "3/7", so its column gets extra room there; from 1500px all six
        // names show and the columns are equal again.
        style={
          variant === "header"
            ? ({
                "--phase-cols": DISPLAY_PHASES.map((_, i) => (i === activeIndex ? "minmax(0,2.2fr)" : "minmax(0,1fr)")).join(" "),
                // From 1500px every phase shows its name: each column sizes to
                // its own content (Lansering is the longest), and the space
                // left over is shared out, so no name gets cut off.
                "--phase-cols-wide": DISPLAY_PHASES.map(() => "auto").join(" "),
              } as React.CSSProperties)
            : undefined
        }
      >
        {DISPLAY_PHASES.map((p, i) => {
          const pr = progress[i];
          const color = PHASE_COLORS[p.value];
          const isCurrent = i === activeIndex;
          const isFuture = i > currentIndex;
          const isViewing = p.value === viewingDisplayPhase;
          const checklist = getChecklistForPhase(p.value);
          const itemNumbers = checklist ? numberChecklist(checklist, i + 1) : [];
          const isOpen = openPhase === p.value;
          const dimmed = isFuture && pr.done === 0;

          const headerStyle = variant === "header";
          const column = headerStyle ? (
            <>
              {/* Niklas's choice, 2026-10-02: the bar is framed in the phase
                  colour. Inside, one segment per step (done in full colour,
                  open at 40%). The frame is a 55% track that draws round in
                  full colour as the phase's kanban cards get done. A finished
                  phase (steps and cards) is one solid bar. */}
              <PhaseBar
                steps={pr.steps}
                pct={pr.pct}
                color={color}
                cards={cardCounts?.[p.value]}
                done={phaseDone(i)}
                // Below 1500px the other phases' columns are too narrow for
                // segments (2–4px each at 1024px): a continuous fill there.
                segments={isCurrent ? "always" : "wide"}
                stepTitle={stepTitle}
                cardsTitle={(c) => t("cardsLabel", { done: c.done, total: c.total })}
              />
              <span className="mt-2 flex items-center gap-2">
                {/* Number circle, as on the homepage: filled, white number, ✓ once
                    done. A ring outside a white gap marks the phase being worked
                    in; how far the others have come shows in their bars. */}
                <span
                  className="mx-[5px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white xl:h-7 xl:w-7 xl:text-[13px]"
                  style={{
                    background: color,
                    boxShadow: isCurrent ? `0 0 0 2px #fff, 0 0 0 3.5px ${color}` : undefined,
                  }}
                  aria-hidden
                >
                  {phaseDone(i) ? "✓" : i + 1}
                </span>
                {/* Below ~1500px the header can't fit six names beside the logo
                    and icons: only the current phase keeps its name there, the
                    others show number + ▾ (name in the tooltip). */}
                <span
                  className={`${newHomeDisplayFont.className} truncate text-[13px] font-bold tracking-[-0.01em] xl:text-sm ${isCurrent ? "" : "hidden min-[1500px]:inline"} text-dark-slate`}
                >
                  {tPhase(p.value)}
                </span>
                {isCurrent && !phaseDone(i) && (
                  // Hidden on the narrowest header widths (in the tooltip there).
                  <span className="hidden shrink-0 text-xs font-semibold tabular-nums text-dark-slate/55 min-[1200px]:inline">
                    {pr.done}/{pr.total}
                  </span>
                )}
                <ChevronDown
                  aria-hidden
                  className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""} ${isCurrent ? "text-dark-slate" : "text-dark-slate/50"}`}
                  strokeWidth={2.5}
                />
              </span>
              <span className="sr-only">
                {t("progressLabel", { done: pr.done, total: pr.total })}
                {cardCounts?.[p.value] ? `. ${t("cardsLabel", { done: cardCounts[p.value]!.done, total: cardCounts[p.value]!.total })}` : ""}
              </span>
            </>
          ) : (
            <>
              {/* On narrow screens only the project's own phase is split into
                  steps — six segmented bars would be ~5px per segment. */}
              {isCurrent ? (
                <StepSegments steps={pr.steps} color={color} title={stepTitle} thin={compact} />
              ) : (
                <span
                  className={`block w-full overflow-hidden rounded-full ${compact ? "h-1.5" : "h-2"}`}
                  style={{ background: hexToRgba(color, 0.2) }}
                  aria-hidden
                >
                  <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${pr.pct}%`, background: color }} />
                </span>
              )}
              <span className={`flex items-center ${compact ? "mt-1.5 gap-1.5" : "mt-2.5 gap-1.5 sm:gap-2"}`}>
                <span
                  className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${compact ? "h-5 w-5 text-[11px]" : "h-6 w-6 text-xs sm:h-7 sm:w-7 sm:text-sm"} ${
                    isCurrent || isViewing ? "ring-2 ring-offset-2" : ""
                  }`}
                  style={{ background: color, opacity: dimmed ? 0.45 : 1, ["--tw-ring-color" as string]: color }}
                  aria-hidden
                >
                  {phaseDone(i) ? "✓" : i + 1}
                </span>
                <span
                  className={`truncate ${compact ? "text-xs" : "text-[13px] sm:text-base"} ${isCurrent ? "font-bold text-dark-slate" : dimmed ? "font-semibold text-dark-slate/45" : "font-semibold text-dark-slate/80"}`}
                >
                  {tPhase(p.value)}
                </span>
              </span>
              <span className="sr-only">{t("progressLabel", { done: pr.done, total: pr.total })}</span>
            </>
          );

          if (compact) {
            return (
              <a
                key={p.value}
                href={`/projects/${slug}/${overviewPathFor(p.value)}`}
                aria-current={isViewing ? "page" : undefined}
                title={t("progressLabel", { done: pr.done, total: pr.total })}
                className="block min-w-0 rounded-md hover:opacity-80"
              >
                {column}
              </a>
            );
          }

          return (
            // z-30 while open: the bars wrap onto two rows below sm, and a
            // dropdown on the first row would otherwise lose to a later
            // column's stacking context on the second.
            <div key={p.value} className={`relative min-w-0 ${isOpen ? "z-30" : "z-10"}`}>
              {checklist ? (
                <button
                  type="button"
                  onClick={(e) => {
                    if (headerStyle) {
                      const r = e.currentTarget.getBoundingClientRect();
                      setMenuPos({ left: Math.min(r.left, window.innerWidth - 300), top: r.bottom + 8 });
                    }
                    setOpenPhase((prev) => (prev === p.value ? null : p.value));
                  }}
                  aria-expanded={isOpen}
                  aria-current={isViewing ? "step" : undefined}
                  title={`${tPhase(p.value)} — ${t("progressLabel", { done: pr.done, total: pr.total })}`}
                  className={`block w-full min-w-0 text-left ${headerStyle ? "-mx-1.5 -my-1 rounded-lg px-1.5 py-1 transition-colors hover:bg-[var(--phase-hover)]" : ""}`}
                  style={headerStyle ? ({ "--phase-hover": hexToRgba(color, 0.12), width: "calc(100% + 0.75rem)" } as React.CSSProperties) : undefined}
                >
                  {column}
                </button>
              ) : (
                <span aria-current={isViewing ? "step" : undefined} className="block min-w-0">
                  {column}
                </span>
              )}

              {isOpen && checklist && (headerStyle
                ? menuPos &&
                  createPortal(
                    // In the header: portalled to <body> with a fixed
                    // position, since the site header clips anything that
                    // hangs below it (same approach as ProjectTopNav's menus).
                    <div
                      ref={dropdownRef}
                      style={{ left: menuPos.left, top: menuPos.top }}
                      className="fixed z-[10001] w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-muted-teal/20 bg-white shadow-lg animate-[fadeIn_0.12s_ease-out]"
                    >
                      {next && i === currentIndex && (
                        <a
                          href={next.href ? `/projects/${slug}/${next.href}` : guideHref(slug, phase, next.key)}
                          className="block border-b border-muted-teal/10 px-3.5 py-2.5 transition-colors hover:bg-coral/10"
                          style={{ background: hexToRgba(color, 0.14) }}
                        >
                          <span className="block text-[11px] font-semibold uppercase tracking-wide text-dark-slate/55">{t("nextStep")}</span>
                          <span className="mt-0.5 block text-sm font-semibold text-dark-slate">
                            {tChecklist(next.key)} <span aria-hidden>→</span>
                          </span>
                        </a>
                      )}
                  {showOverviews && (
                    <a
                      href={`/projects/${slug}/${overviewPathFor(p.value)}`}
                      className="flex items-center justify-between border-b border-muted-teal/10 px-3.5 py-2.5 text-sm font-semibold text-seagrass transition-colors hover:bg-seagrass/5"
                    >
                      {t("overviewLinkLabel", { phase: tPhase(p.value) })} <span aria-hidden>→</span>
                    </a>
                  )}
                  <a
                    href={guideHref(slug, p.value)}
                    className="block border-b border-muted-teal/10 px-3.5 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-dark-slate/40 transition-colors hover:text-seagrass"
                  >
                    {t("guideLinkLabel", { phase: tPhase(p.value) })}
                  </a>
                  <div className="py-1">
                    {checklist.map((item, j) => {
                      const done = doneKeys.has(item.key);
                      const isAuto = auto.has(item.key);
                      const editable = canEdit && !isAuto;
                      return (
                        <div key={item.key} className="flex items-center gap-2.5 px-3.5 py-2 transition-colors hover:bg-seagrass/5">
                          <button
                            type="button"
                            disabled={isPending || !editable}
                            onClick={() => handleToggle(p.value, item.key, !done)}
                            aria-checked={done}
                            role="checkbox"
                            title={isAuto ? t("autoDone") : undefined}
                            className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] transition-colors ${
                              done ? "bg-seagrass" : "border border-muted-teal/50 bg-white"
                            } ${editable ? "" : "cursor-default"}`}
                          >
                            {done && (
                              <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <span className={`text-sm ${done ? "text-dark-slate/30 line-through" : "text-dark-slate/80"}`}>
                            <span className={`font-medium ${done ? "text-dark-slate/30 line-through" : "text-dark-slate/40"}`}>{itemNumbers[j]}</span>{" "}
                            <a
                              href={item.href ? `/projects/${slug}/${item.href}` : guideHref(slug, p.value, item.key)}
                              className={`hover:underline ${done ? "text-dark-slate/30 line-through" : ""}`}
                            >
                              {tChecklist(item.key)}
                            </a>
                            {isAuto && <span className="ml-1.5 whitespace-nowrap text-[10px] font-medium text-seagrass no-underline">{t("autoDoneShort")}</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                    </div>,
                    document.body,
                  )
                : (
                <div
                  className={`absolute top-full mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-muted-teal/20 bg-white shadow-lg animate-[fadeIn_0.12s_ease-out] ${
                    // Right-aligned in the last column (3 per row on phones,
                    // 6 from sm) so the dropdown never runs off-screen.
                    i % 3 === 2 ? "right-0" : "left-0"
                  } ${i >= 4 ? "sm:left-auto sm:right-0" : "sm:left-0 sm:right-auto"}`}
                >
                  {showOverviews && (
                    <a
                      href={`/projects/${slug}/${overviewPathFor(p.value)}`}
                      className="flex items-center justify-between border-b border-muted-teal/10 px-3.5 py-2.5 text-sm font-semibold text-seagrass transition-colors hover:bg-seagrass/5"
                    >
                      {t("overviewLinkLabel", { phase: tPhase(p.value) })} <span aria-hidden>→</span>
                    </a>
                  )}
                  <a
                    href={guideHref(slug, p.value)}
                    className="block border-b border-muted-teal/10 px-3.5 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-dark-slate/40 transition-colors hover:text-seagrass"
                  >
                    {t("guideLinkLabel", { phase: tPhase(p.value) })}
                  </a>
                  <div className="py-1">
                    {checklist.map((item, j) => {
                      const done = doneKeys.has(item.key);
                      const isAuto = auto.has(item.key);
                      const editable = canEdit && !isAuto;
                      return (
                        <div key={item.key} className="flex items-center gap-2.5 px-3.5 py-2 transition-colors hover:bg-seagrass/5">
                          <button
                            type="button"
                            disabled={isPending || !editable}
                            onClick={() => handleToggle(p.value, item.key, !done)}
                            aria-checked={done}
                            role="checkbox"
                            title={isAuto ? t("autoDone") : undefined}
                            className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] transition-colors ${
                              done ? "bg-seagrass" : "border border-muted-teal/50 bg-white"
                            } ${editable ? "" : "cursor-default"}`}
                          >
                            {done && (
                              <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <span className={`text-sm ${done ? "text-dark-slate/30 line-through" : "text-dark-slate/80"}`}>
                            <span className={`font-medium ${done ? "text-dark-slate/30 line-through" : "text-dark-slate/40"}`}>{itemNumbers[j]}</span>{" "}
                            <a
                              href={item.href ? `/projects/${slug}/${item.href}` : guideHref(slug, p.value, item.key)}
                              className={`hover:underline ${done ? "text-dark-slate/30 line-through" : ""}`}
                            >
                              {tChecklist(item.key)}
                            </a>
                            {isAuto && <span className="ml-1.5 whitespace-nowrap text-[10px] font-medium text-seagrass no-underline">{t("autoDoneShort")}</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </nav>

      {next && variant !== "header" && (
        <p className={`${compact ? "mt-2 text-xs" : "mt-4 text-sm"} text-dark-slate/70`}>
          <span className="font-semibold text-dark-slate">{t("nextStep")}</span>{" "}
          <a href={next.href ? `/projects/${slug}/${next.href}` : guideHref(slug, phase, next.key)} className="font-medium text-seagrass hover:underline">
            {tChecklist(next.key)} →
          </a>
        </p>
      )}
    </div>
  );
}

// A phase bar split into its steps. Hovering a segment names the step.
function StepSegments({ steps, color, title, thin, className = "flex" }: { steps: PhaseStep[]; color: string; title: (s: PhaseStep) => string; thin?: boolean; className?: string }) {
  return (
    <span className={`${className} w-full gap-[2px] ${thin ? "h-1.5" : "h-full"}`} aria-hidden>
      {steps.map((s) => (
        <span key={s.key} title={title(s)} className="relative block h-full min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: hexToRgba(color, 0.4) }}>
          <span className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500" style={{ width: `${s.frac * 100}%`, background: color }} />
        </span>
      ))}
    </span>
  );
}

// The header's phase bar: a 12px pill with a 1.5px frame and the steps
// inside (3px in). The frame is an SVG rect so it can be drawn part-way —
// pathLength 100 makes the dash the cards' done-percentage, starting top
// left and running clockwise. No cards: just the track.
function PhaseBar({
  steps, pct, color, cards, done, segments, stepTitle, cardsTitle,
}: {
  steps: PhaseStep[];
  pct: number;
  color: string;
  cards?: PhaseCardCount;
  done: boolean;
  segments: "always" | "wide";
  stepTitle: (s: PhaseStep) => string;
  cardsTitle: (c: PhaseCardCount) => string;
}) {
  if (done) return <span className="block h-3 w-full rounded-full" style={{ background: color }} aria-hidden />;
  const cardPct = cards && cards.total > 0 ? (cards.done / cards.total) * 100 : 0;
  return (
    <span className="relative block h-3 w-full rounded-full bg-white" title={cards && cards.total > 0 ? cardsTitle(cards) : undefined} aria-hidden>
      <svg className="pointer-events-none absolute left-[0.75px] top-[0.75px] overflow-visible" style={{ width: "calc(100% - 1.5px)", height: "calc(100% - 1.5px)" }}>
        <rect width="100%" height="100%" rx="5.25" fill="none" stroke={hexToRgba(color, 0.55)} strokeWidth="1.5" />
        {cardPct > 0 && (
          <rect
            width="100%"
            height="100%"
            rx="5.25"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${cardPct} 100`}
            className="transition-[stroke-dasharray] duration-500"
          />
        )}
      </svg>
      <span className="absolute inset-[3px]">
        <StepSegments steps={steps} color={color} title={stepTitle} className={segments === "always" ? "flex" : "hidden min-[1500px]:flex"} />
        {segments === "wide" && (
          <span className="block h-full w-full overflow-hidden rounded-full min-[1500px]:hidden" style={{ background: hexToRgba(color, 0.4) }}>
            <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
          </span>
        )}
      </span>
    </span>
  );
}
