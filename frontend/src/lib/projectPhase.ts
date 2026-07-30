// Initiative lifecycle phases, per PRD.md 4d. Ordered idea -> impact;
// transitions only ever move forward one step at a time (see
// ProjectPhaseAdvance and PhaseTransition).
export const PROJECT_PHASES = [
  { value: "IDEA", label: "Idé", color: "bg-dry-sage/40 text-dark-slate/70" },
  { value: "SPRINT", label: "Sprint", color: "bg-yellow-100 text-yellow-800" },
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

// Checklist sub-steps within every phase (PRD 4d) — a UI progress checklist,
// not separate phase values. peer_feedback_requested is informative only,
// never a gate (idea -> sprint is always the initiator's own call).
export const INITIATIVE_CHECKLIST_ITEMS: Record<ProjectPhaseValue, { key: string; label: string; href?: string }[]> = {
  IDEA: [
    { key: "dream_defined", label: "Beskriv idén" },
    { key: "ai_reviewed", label: "Be AI granska idén" },
    { key: "peer_feedback_requested", label: "Bjud in vänner att ge feedback" },
    { key: "lean_canvas_created", label: "Gör en Lean Canvas", href: "lean-canvas" },
  ],
  SPRINT: [
    { key: "map_understand", label: "Kartlägga & förstå" },
    { key: "sketch_solutions", label: "Skissa lösningar" },
    { key: "decide_plan", label: "Beslut & planera" },
    { key: "build_prototype", label: "Bygga prototyp" },
    { key: "test_with_users", label: "Testa med användare" },
    { key: "sprint_lean_canvas", label: "Skriva ett enkelt lean canvas / projektbeskrivning", href: "lean-canvas" },
    { key: "core_team_formed", label: "Definiera roller och bilda kärnteam" },
    { key: "kanban_seeded", label: "Sätta upp Kanban-board med första uppgifterna", href: "kanban" },
    { key: "pilot_success_criteria", label: "Definiera framgångskriterier för pilotfasen" },
    { key: "rough_budget_estimated", label: "Ta fram grov budget/resursbehov" },
  ],
  PILOT: [
    { key: "todo_created", label: "Fyll på med arbetsuppgifter" },
    { key: "collaborators_invited", label: "Bjud in medskapare" },
    { key: "team_formed", label: "Formera team" },
    { key: "resources_secured", label: "Säkra resurser" },
    { key: "pilot_scope_defined", label: "Avgränsa ett litet, konkret test (tid, plats, målgrupp)" },
    { key: "pilot_executed_documented", label: "Genomföra piloten och dokumentera lärdomar löpande" },
    { key: "pilot_results_collected", label: "Samla in kvantitativa/kvalitativa resultat" },
    { key: "pilot_model_adjusted", label: "Justera modellen baserat på feedback" },
    { key: "pilot_go_no_go", label: "Utvärdera mot framgångskriterierna → go/no-go beslut" },
  ],
  PRODUCTION: [
    { key: "process_scaled_up", label: "Skala upp processen som fungerade i piloten" },
    { key: "workflows_formalized", label: "Formalisera arbetsflöden och ansvar" },
    { key: "funding_secured", label: "Säkra finansiering" },
    { key: "impact_measurement_setup", label: "Sätta upp mätning/rapportering av impact", href: "impact" },
    { key: "quality_assured", label: "Kvalitetssäkring" },
  ],
  ESTABLISH: [
    { key: "stable_operations_funding", label: "Bygga stabil drift och återkommande finansiering" },
    { key: "partnerships_formalized", label: "Formalisera partnerskap och samarbeten", href: "partnerships" },
    { key: "playbook_documented", label: "Dokumentera \"playbook\" så andra kan replikera", href: "wiki" },
    { key: "supporter_base_built", label: "Bygga upp en stabil community/supporterbas" },
    { key: "review_council_deep_review", label: "Granskningsråd gör en djupare granskning inför skalning" },
  ],
  SCALE: [
    { key: "scale_vs_fork_decided", label: "Bestämma Skalning vs. Fork (samma projekt växer vs. nytt oberoende initiativ)", href: "scale" },
    { key: "new_geographies_identified", label: "Identifiera nya geografier/målgrupper" },
    { key: "local_teams_or_license", label: "Bygga lokala team eller licensiera modellen" },
    { key: "scaling_goals_set", label: "Sätta upp mätbara skalningsmål" },
    { key: "expansion_capital_secured", label: "Säkra kapital för expansion" },
  ],
  IMPACT: [
    { key: "sdg_impact_measured", label: "Mäta och rapportera faktisk SDG-påverkan", href: "impact" },
    { key: "impact_externally_verified", label: "Extern verifiering/impact-rapport" },
    { key: "results_celebrated", label: "Fira och synliggöra resultat för community och finansiärer" },
    { key: "next_step_decided", label: "Besluta om nästa steg: fortsätta, replikera, eller avsluta ansvarsfullt" },
  ],
};
