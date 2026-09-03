import { INITIATIVE_CHECKLIST_ITEMS } from "@/lib/projectPhase";

// The step indicator shown across both /projects/new (step 0 — "Beskriv
// projektet" both creates the Project and saves its description in one
// go) and /projects/[slug]/guide (steps 1-7, the rest of the IDEA-phase
// checklist) — one continuous-looking guide split across two routes only
// because step 0 needs to create the Project before anything else can
// attach to it.
//
// The wizard's final step is Design Sprint prep, whose itemKey
// (sprint_prepped) now lives in PILOT's checklist array, not IDEA's (see
// projectPhase.ts — Design Sprint moved to Fas 2/Uppstart). It's appended
// here explicitly so the step indicator still shows all 8 wizard steps.
export const IDEA_GUIDE_STEPS = [
  ...INITIATIVE_CHECKLIST_ITEMS.IDEA,
  INITIATIVE_CHECKLIST_ITEMS.PILOT.find((item) => item.key === "sprint_prepped")!,
];
