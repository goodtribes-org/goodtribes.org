// Initiative lifecycle phases, per PRD.md 4d. Ordered idea -> impact;
// transitions only ever move forward one step at a time (see
// ProjectPhaseAdvance and PhaseTransition).
export const PROJECT_PHASES = [
  { value: "IDEA", label: "Idé", color: "bg-dry-sage/40 text-dark-slate/70" },
  { value: "PROJECT", label: "Projekt", color: "bg-yellow-100 text-yellow-800" },
  { value: "PILOT", label: "Pilot", color: "bg-orange-100 text-orange-800" },
  { value: "PRODUCTION", label: "Produktion", color: "bg-blue-100 text-blue-800" },
  { value: "ESTABLISH", label: "Etablera", color: "bg-teal-100 text-teal-800" },
  { value: "SCALE", label: "Skala", color: "bg-purple-100 text-purple-800" },
  { value: "IMPACT", label: "Impact", color: "bg-green-100 text-green-800" },
] as const;

export type ProjectPhaseValue = (typeof PROJECT_PHASES)[number]["value"];

export const PROJECT_PHASE_LABEL: Record<string, string> = Object.fromEntries(
  PROJECT_PHASES.map((p) => [p.value, p.label])
);

export const PROJECT_PHASE_COLOR: Record<string, string> = Object.fromEntries(
  PROJECT_PHASES.map((p) => [p.value, p.color])
);

const VALID_PROJECT_PHASE_VALUES: readonly string[] = PROJECT_PHASES.map((p) => p.value);

export function isValidProjectPhase(value: string): value is ProjectPhaseValue {
  return VALID_PROJECT_PHASE_VALUES.includes(value);
}

// Returns the immediately-next phase in the sequence, or null if already at
// the terminal phase (IMPACT). Transitions never skip steps or go backwards
// (PRD 4d: "Övergångar sker endast framåt").
export function getNextPhase(current: ProjectPhaseValue): ProjectPhaseValue | null {
  const index = PROJECT_PHASES.findIndex((p) => p.value === current);
  const next = PROJECT_PHASES[index + 1];
  return next ? next.value : null;
}

// Checklist sub-steps within the IDEA and PROJECT phases (PRD 4d) — a UI
// progress checklist, not separate phase values. peer_feedback_requested is
// informative only, never a gate (idea -> project is always the
// initiator's own call).
export const INITIATIVE_CHECKLIST_ITEMS: Record<"IDEA" | "PROJECT", { key: string; label: string; href?: string }[]> = {
  IDEA: [
    { key: "dream_defined", label: "Beskriv idén" },
    { key: "ai_reviewed", label: "Be AI granska idén" },
    { key: "peer_feedback_requested", label: "Bjud in vänner att ge feedback" },
    { key: "lean_canvas_created", label: "Gör en Lean Canvas", href: "lean-canvas" },
  ],
  PROJECT: [
    { key: "todo_created", label: "Fyll på med arbetsuppgifter" },
    { key: "collaborators_invited", label: "Bjud in medskapare" },
    { key: "team_formed", label: "Formera team" },
    { key: "resources_secured", label: "Säkra resurser" },
  ],
};
