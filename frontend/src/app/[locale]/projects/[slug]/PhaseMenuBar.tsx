"use client";

import { Fragment, useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { toggleChecklistItem } from "./(workspace)/edit/actions";
import {
  DISPLAY_PHASES,
  toDisplayPhase,
  getChecklistForPhase,
  numberChecklist,
  PHASE_COLORS,
  hexToRgba,
  type ProjectPhaseValue,
} from "@/lib/projectPhase";

interface Props {
  slug: string;
  phase: ProjectPhaseValue;
  completedKeys: string[];
  canEdit: boolean;
  // Set on guide pages so the pill for the guide being read gets a ring —
  // independent of `phase` (the project's actual current phase, still shown
  // via the solid fill), since a guide can be opened for any phase.
  viewingPhase?: ProjectPhaseValue;
}

// One continuous arrow made of six colored segments, edge to edge — only
// the last segment (Impact) carries the arrowhead point; the rest are plain
// rectangles, so the row reads as a single long arrow rather than six
// separate shapes.
const ARROW_CLIP_LAST = "polygon(0% 0%, 78% 0%, 100% 50%, 78% 100%, 0% 100%)";

// Fas- och stegmeny (PRD 4d) — sex pilar i rad, "1. Idé", "2. Pilot" osv.
// Idé täcker både IDEA och SPRINT (se lib/projectPhase.ts — sammanslaget på
// UI-nivå, inget separat "Sprint"-steg längre). Varje pil fylls efter hur
// stor andel av fasens checklista som är avklarad — samma data som innan,
// bara flyttad från linjen mellan faserna till fasen själv. Klick fäller
// fortfarande ut samma numrerade undermeny som tidigare.
export default function PhaseMenuBar({ slug, phase, completedKeys, canEdit, viewingPhase }: Props) {
  const t = useTranslations("PhaseMenuBar");
  const tPhase = useTranslations("ProjectPhase");
  const tChecklist = useTranslations("ProjectPhaseChecklist");
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set(completedKeys));
  const [isPending, startTransition] = useTransition();
  const [openPhase, setOpenPhase] = useState<ProjectPhaseValue | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Guide pages render their own step UI alongside this menu — when a step
  // gets marked done there, the server action revalidates this route too,
  // so pick up the fresh completedKeys instead of staying stuck on the set
  // this component first mounted with.
  useEffect(() => {
    setDoneKeys(new Set(completedKeys));
  }, [completedKeys]);

  const displayPhase = toDisplayPhase(phase);
  const currentIndex = DISPLAY_PHASES.findIndex((p) => p.value === displayPhase);
  const viewingDisplayPhase = viewingPhase ? toDisplayPhase(viewingPhase) : null;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenPhase(null);
    }
    if (openPhase) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openPhase]);

  function handleToggle(p: ProjectPhaseValue, itemKey: string, done: boolean) {
    if (!canEdit) return;
    setDoneKeys((prev) => {
      const next = new Set(prev);
      if (done) next.add(itemKey); else next.delete(itemKey);
      return next;
    });
    startTransition(() => toggleChecklistItem(slug, p, itemKey, done));
  }

  // Fyllnadsgrad per fas — driver hur stor del av pilen som färgas.
  const phaseProgress = DISPLAY_PHASES.map((p) => {
    const items = getChecklistForPhase(p.value) ?? [];
    const done = items.filter((item) => doneKeys.has(item.key)).length;
    const total = items.length;
    return { total, pct: total > 0 ? Math.round((done / total) * 100) : 0, complete: total > 0 && done === total };
  });

  return (
    <div ref={menuRef}>
      <div className="flex items-stretch w-full h-9 sm:h-10">
        {DISPLAY_PHASES.map((p, i) => {
          const isCurrent = i === currentIndex;
          const isViewing = p.value === viewingDisplayPhase;
          const checklist = getChecklistForPhase(p.value);
          const itemNumbers = checklist ? numberChecklist(checklist, i + 1) : [];
          const isOpen = openPhase === p.value;

          // Fyllnaden är rent datadriven — hur stor andel av FASENS EGEN
          // checklista som är avklarad, oavsett om projektet "tekniskt" har
          // passerat fasen. De kan skilja sig åt rejält: ett gammalt projekt
          // vars fas sattes direkt (utan att någon någonsin bockat av
          // checklistan här) ska visa 0% fyllt, inte grönt bara för att det
          // ligger bakåt i tiden — annars ljuger stapeln om verkligheten.
          const pct = phaseProgress[i].pct;

          const isLastPhase = i === DISPLAY_PHASES.length - 1;
          const clip = isLastPhase ? ARROW_CLIP_LAST : undefined;
          // Vit text bara när fyllnaden faktiskt täcker större delen av
          // pilen (annars blir vit text på den ljusa, ofyllda bakgrunden
          // olöslig) — annars mörk text som alltid är läsbar mot den ljusa
          // bakgrunden.
          const textIsLight = pct >= 55;
          const textClass = textIsLight ? "text-white drop-shadow-sm" : "text-dark-slate/70";
          // Varje fas har sin egen färg (kall → varm, idé till impact) —
          // kanten är alltid den färgen, redan innan något är ibockat.
          const phaseColor = PHASE_COLORS[p.value];
          const cssVars = {
            "--phase-color-soft": hexToRgba(phaseColor, 0.55),
            "--phase-color-full": phaseColor,
          } as CSSProperties;

          return (
            <Fragment key={p.value}>
              <div className={`group relative flex-1 ${isOpen ? "z-30" : "z-10"}`} style={cssVars}>
                {/* Med en egen färg per fas bär inte längre färgen själv
                    info om vilken fas som är aktuell — en liten diskret
                    prick ovanför fyller in det. */}
                {isCurrent && (
                  <span
                    className="pointer-events-none absolute -top-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-dark-slate"
                    aria-hidden="true"
                  />
                )}
                <button
                  type="button"
                  onClick={() => checklist && setOpenPhase((prev) => (prev === p.value ? null : p.value))}
                  aria-expanded={checklist ? isOpen : undefined}
                  aria-current={isViewing ? "step" : undefined}
                  className={`relative block w-full h-full transition-transform duration-150 ${
                    checklist ? "cursor-pointer hover:-translate-y-1" : "cursor-default"
                  }`}
                >
                  {/* Bakgrund + kant — kanten har fasens egen färg, så man
                      ser vilken färg som väntar redan innan den är ibockad;
                      mättas vid hover */}
                  <span
                    className="absolute inset-0 border bg-white transition-colors border-[color:var(--phase-color-soft)] group-hover:border-[color:var(--phase-color-full)]"
                    style={{ clipPath: clip }}
                    aria-hidden="true"
                  />
                  {/* Fyllnad */}
                  {pct > 0 && (
                    <span className="absolute inset-0 overflow-hidden" style={{ clipPath: clip }} aria-hidden="true">
                      <span
                        className="absolute inset-y-0 left-0 bg-[color:var(--phase-color-full)] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  )}
                  {/* Etikett */}
                  <span className={`absolute inset-0 flex items-center justify-center gap-1 px-1 text-[11px] sm:text-sm font-bold uppercase tracking-wide transition-colors ${textClass}`}>
                    {tPhase(p.value)}
                    {checklist && (
                      <svg
                        className={`w-3 h-3 flex-shrink-0 opacity-70 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </span>
                  {/* Hover-ledtext */}
                  {checklist && (
                    <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-dark-slate px-2.5 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {t("showChecklistTooltip")}
                    </span>
                  )}
                </button>

                {isOpen && checklist && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-muted-teal/20 rounded-xl shadow-lg z-20 overflow-hidden animate-[fadeIn_0.12s_ease-out]">
                    <a
                      href={p.value === "IDEA" ? `/projects/${slug}/guide` : `/projects/${slug}/guide/${p.value.toLowerCase()}`}
                      className="block px-3.5 pt-3 pb-2 text-xs font-semibold text-dark-slate/40 uppercase tracking-wide border-b border-muted-teal/10 hover:text-seagrass transition-colors"
                    >
                      {t("guideLinkLabel", { phase: tPhase(p.value) })}
                    </a>
                    <div className="py-1">
                      {checklist.map((item, j) => {
                        const done = doneKeys.has(item.key);
                        return (
                          <div key={item.key} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-seagrass/5 transition-colors">
                            <button
                              type="button"
                              disabled={isPending || !canEdit}
                              onClick={() => handleToggle(p.value, item.key, !done)}
                              aria-checked={done}
                              role="checkbox"
                              className={`w-4 h-4 rounded-[4px] flex items-center justify-center flex-shrink-0 transition-colors ${
                                done ? "bg-seagrass" : "border border-muted-teal/50 bg-white"
                              } ${canEdit ? "" : "cursor-default"}`}
                            >
                              {done && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                            <span className={`text-sm ${done ? "text-dark-slate/30 line-through" : "text-dark-slate/80"}`}>
                              <span className={`font-medium ${done ? "text-dark-slate/30 line-through" : "text-dark-slate/40"}`}>
                                {itemNumbers[j]}
                              </span>{" "}
                              <a
                                href={
                                  item.href
                                    ? `/projects/${slug}/${item.href}`
                                    : p.value === "IDEA"
                                      ? `/projects/${slug}/guide?step=${item.key}`
                                      : `/projects/${slug}/guide/${p.value.toLowerCase()}?step=${item.key}`
                                }
                                className={`hover:underline ${done ? "text-dark-slate/30 line-through" : ""}`}
                              >
                                {tChecklist(item.key)}
                              </a>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
