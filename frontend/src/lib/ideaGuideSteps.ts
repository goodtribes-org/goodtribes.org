import { INITIATIVE_CHECKLIST_ITEMS } from "@/lib/projectPhase";

// The step indicator shown across both /projects/new (step 0 — "Beskriv
// projektet" both creates the Project and saves its description in one
// go) and /projects/[slug]/guide (steps 1-3, the rest of the IDEA-phase
// checklist) — one continuous-looking guide split across two routes only
// because step 0 needs to create the Project before anything else can
// attach to it.
export const IDEA_GUIDE_STEPS = INITIATIVE_CHECKLIST_ITEMS.IDEA;
