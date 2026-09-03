// Initiative lifecycle phases, per PRD.md 4d. Ordered idea -> impact;
// transitions only ever move forward one step at a time (see
// ProjectPhaseAdvance and PhaseTransition).
//
// IDEA and SPRINT are merged into a single "Idé" step in the UI (PRD 4d,
// vX.X) — both enum values are kept in the database (no migration, same
// approach as the v4.7 rollback: build on the existing data model rather
// than a risky schema change), but SPRINT is never a new project's target
// phase anymore (see getNextPhase) and its label/checklist are folded into
// IDEA's everywhere. Use DISPLAY_PHASES for anything that renders the
// visible journey (steppers, filters) so SPRINT doesn't show as a
// duplicate step; PROJECT_PHASES stays the full 7-value source of truth
// for label/color lookups of a project's actual stored phase.
export const PROJECT_PHASES = [
  { value: "IDEA", label: "Idé", color: "bg-dry-sage/40 text-dark-slate/70" },
  { value: "SPRINT", label: "Idé", color: "bg-dry-sage/40 text-dark-slate/70" },
  { value: "PILOT", label: "Uppstart", color: "bg-orange-100 text-orange-800" },
  { value: "PRODUCTION", label: "Lansering", color: "bg-blue-100 text-blue-800" },
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

// The visible journey — 6 steps, SPRINT folded into IDEA. Use for any
// stepper/filter UI; use PROJECT_PHASES for raw per-value label/color
// lookups instead.
export const DISPLAY_PHASES = PROJECT_PHASES.filter((p) => p.value !== "SPRINT");

// A project's stored phase, mapped onto its visible DISPLAY_PHASES entry
// (SPRINT displays as IDEA's step).
export function toDisplayPhase(phase: ProjectPhaseValue): Exclude<ProjectPhaseValue, "SPRINT"> {
  return phase === "SPRINT" ? "IDEA" : phase;
}

const VALID_PROJECT_PHASE_VALUES: readonly string[] = PROJECT_PHASES.map((p) => p.value);

export function isValidProjectPhase(value: string): value is ProjectPhaseValue {
  return VALID_PROJECT_PHASE_VALUES.includes(value);
}

// Returns the immediately-next phase in the sequence, or null if already at
// the terminal phase (IMPACT). Transitions never skip steps or go backwards
// (PRD 4d: "Övergångar sker endast framåt"). IDEA and SPRINT both advance
// straight to PILOT — one click out of the merged "Idé" step, regardless of
// which of the two underlying values a project happens to be stored at.
export function getNextPhase(current: ProjectPhaseValue): ProjectPhaseValue | null {
  if (current === "IDEA" || current === "SPRINT") return "PILOT";
  const index = PROJECT_PHASES.findIndex((p) => p.value === current);
  const next = PROJECT_PHASES[index + 1];
  return next ? next.value : null;
}

// Checklist sub-steps within every phase (PRD 4d) — a UI progress checklist,
// not separate phase values. peer_feedback_requested is informative only,
// never a gate (idea -> sprint is always the initiator's own call).
//
// An item with `parentKey` set is a sub-step of the item with that key —
// PhaseMenuBar numbers it as a sub-number (e.g. 2.3.1) of its parent's
// top-level number instead of getting its own, and it must sit immediately
// after its parent in the array (source order defines the grouping). This
// replaced a one-off hardcoded "SPRINT's items are IDEA item 5's sub-steps"
// special case in PhaseMenuBar with a reusable mechanism — used below both
// for the Design Sprint's 5 steps (2.3.x) and for 4.3's two funding items.
//
// SPRINT's own items now live inline inside PILOT (moved there so Design
// Sprint shows under Fas 2/Uppstart, not Fas 1/Idé); the SPRINT array here
// is kept empty only so this stays a complete Record<ProjectPhaseValue, ...>
// for type purposes and so getChecklistForPhase(SPRINT) — called for
// projects whose stored raw phase is still literally "SPRINT" — can keep
// returning IDEA's list, the same visible step per toDisplayPhase.
//
// 2026-09-03 restructuring also dropped 7 itemKeys with no home in the new
// structure: sprint_lean_canvas, todo_created, collaborators_invited,
// team_formed, resources_secured, pilot_model_adjusted, quality_assured.
// Their InitiativeChecklistItem rows are left in place, unread — same
// intentional-orphan pattern as the TimeLog table (see root CLAUDE.md).
export const INITIATIVE_CHECKLIST_ITEMS: Record<
  ProjectPhaseValue,
  { key: string; label: string; href?: string; parentKey?: string }[]
> = {
  IDEA: [
    { key: "dream_defined", label: "Beskriv projektet" },
    { key: "ai_reviewed", label: "Välj SDG" },
    { key: "lean_canvas_created", label: "Lean Canvas", href: "lean-canvas" },
    { key: "value_proposition_created", label: "Värdeerbjudande", href: "value-proposition" },
    { key: "target_audience_interviews", label: "Målgruppsintervjuer", href: "interviews" },
    { key: "market_scan_partners", label: "Omvärldsbevakning", href: "market-scan" },
    { key: "peer_feedback_requested", label: "Bjud in vänner / Bygg teamet" },
  ],
  SPRINT: [],
  PILOT: [
    { key: "pilot_guide_read", label: "Uppstart guiden" },
    { key: "core_team_formed", label: "Definiera roller och bilda kärnteam" },
    { key: "sprint_prepped", label: "Design Sprint (5 steg)", href: "sprints" },
    { key: "map_understand", label: "Kartlägga & förstå", parentKey: "sprint_prepped" },
    { key: "sketch_solutions", label: "Skissa lösningar", parentKey: "sprint_prepped" },
    { key: "decide_plan", label: "Beslut & planera", parentKey: "sprint_prepped" },
    { key: "build_prototype", label: "Bygga prototyp", parentKey: "sprint_prepped" },
    { key: "test_with_users", label: "Testa med användare", parentKey: "sprint_prepped" },
    { key: "kanban_seeded", label: "Sätta upp Kanban-board med första uppgifterna", href: "kanban" },
    { key: "rough_budget_estimated", label: "Ta fram grov budget/resursbehov" },
    { key: "pilot_scope_defined", label: "Planera och avgränsa piloten" },
  ],
  PRODUCTION: [
    { key: "production_guide_read", label: "Lansering guiden" },
    { key: "pilot_success_criteria", label: "Definiera framgångskriterier för pilotfasen" },
    { key: "pilot_executed_documented", label: "Genomföra piloten och dokumentera lärdomar löpande" },
    { key: "pilot_results_collected", label: "Samla in kvantitativa/kvalitativa resultat" },
    { key: "pilot_go_no_go", label: "Utvärdera piloten mot framgångskriterierna → go/no-go beslut" },
    { key: "launch_marketing_plan_created", label: "Lanserings- och marknadsplan", href: "launch-plan" },
    { key: "workflows_formalized", label: "Formalisera arbetsflöden och ansvar" },
    { key: "impact_measurement_setup", label: "Sätta upp mätning/rapportering av impact", href: "impact" },
  ],
  ESTABLISH: [
    { key: "establish_guide_read", label: "Etablera guiden" },
    { key: "process_scaled_up", label: "Skala upp processen som fungerade i piloten" },
    { key: "stable_operations_funding", label: "Bygga stabil drift och återkommande finansiering" },
    { key: "funding_secured", label: "Säkra finansiering", parentKey: "stable_operations_funding" },
    { key: "partnerships_formalized", label: "Formalisera partnerskap och samarbeten", href: "partnerships" },
    { key: "supporter_base_built", label: "Bygga upp en stabil community/supporterbas" },
    { key: "playbook_documented", label: "Dokumentera \"playbook\" så andra kan replikera", href: "wiki" },
    { key: "review_council_deep_review", label: "Granskningsråd gör en djupare granskning inför skalning" },
  ],
  SCALE: [
    { key: "scale_guide_read", label: "Skala guiden" },
    { key: "scale_vs_fork_decided", label: "Bestämma Skalning vs. Fork (samma projekt växer vs. nytt oberoende initiativ)", href: "scale" },
    { key: "scaling_goals_set", label: "Sätta upp mätbara skalningsmål" },
    { key: "new_geographies_identified", label: "Identifiera nya geografier/målgrupper" },
    { key: "expansion_capital_secured", label: "Säkra kapital för expansion" },
    { key: "local_teams_or_license", label: "Bygga lokala team eller licensiera modellen" },
  ],
  IMPACT: [
    { key: "impact_guide_read", label: "Impact guiden" },
    { key: "sdg_impact_measured", label: "Mäta och rapportera faktisk SDG-påverkan", href: "impact" },
    { key: "impact_externally_verified", label: "Extern verifiering/impact-rapport" },
    { key: "results_celebrated", label: "Fira och synliggöra resultat för community och finansiärer" },
    { key: "next_step_decided", label: "Besluta om nästa steg: fortsätta, replikera, eller avsluta ansvarsfullt" },
  ],
};

// The checklist for a project's stored phase. SPRINT (a project's raw
// stored phase can still literally be this, pre-existing data) returns
// IDEA's list — same visible "Idé" step per toDisplayPhase. Design Sprint's
// own steps now render under PILOT (Fas 2/Uppstart), not here.
export function getChecklistForPhase(phase: ProjectPhaseValue) {
  if (phase === "SPRINT") return INITIATIVE_CHECKLIST_ITEMS.IDEA;
  return INITIATIVE_CHECKLIST_ITEMS[phase];
}
