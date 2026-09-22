import { getChecklistForPhase, toDisplayPhase, DISPLAY_PHASES, type ProjectPhaseValue } from "./projectPhase";

export type PhaseAwareNavItem = { phase?: ProjectPhaseValue };

// A phase counts as "completed" once every one of its checklist itemKeys has
// been checked off (InitiativeChecklistItem.completedAt). Only display
// phases are ever passed in here (see toDisplayPhase below), so SPRINT's
// always-empty checklist (folded into IDEA, see projectPhase.ts) never
// needs to be handled directly.
function isPhaseCompleted(phase: ProjectPhaseValue, completedKeys: Set<string>): boolean {
  const items = getChecklistForPhase(phase);
  return items.length > 0 && items.every((item) => completedKeys.has(item.key));
}

// Partitions a flat nav item list into three buckets for ProjectTopNav's phase-tools menu:
// - current: phase-agnostic items (no `phase` tag) plus items tagged for the
//   project's current phase, or for an earlier phase that isn't fully
//   checked off yet (so nothing disappears before its own phase is done).
// - early: items tagged for an earlier, already-completed phase -- collapsed
//   into a "Tidiga verktyg" group rather than removed.
// - locked: items tagged for a phase the project hasn't reached yet -- shown
//   as a grayed-out, non-navigable preview.
export function groupNavItemsByPhase<T extends PhaseAwareNavItem>(
  items: T[],
  currentPhase: ProjectPhaseValue,
  completedChecklistKeys: string[]
): { current: T[]; early: T[]; locked: T[] } {
  const completedKeys = new Set(completedChecklistKeys);
  const displayCurrent = toDisplayPhase(currentPhase);
  const order = DISPLAY_PHASES.map((p) => p.value);
  const currentIndex = order.indexOf(displayCurrent);

  const current: T[] = [];
  const early: T[] = [];
  const locked: T[] = [];

  for (const item of items) {
    if (!item.phase) {
      current.push(item);
      continue;
    }
    const itemPhase = toDisplayPhase(item.phase);
    const itemIndex = order.indexOf(itemPhase);
    if (itemIndex === currentIndex) {
      current.push(item);
    } else if (itemIndex > currentIndex) {
      locked.push(item);
    } else if (isPhaseCompleted(item.phase, completedKeys)) {
      early.push(item);
    } else {
      current.push(item);
    }
  }

  return { current, early, locked };
}
