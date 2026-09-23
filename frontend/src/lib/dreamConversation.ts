// The six areas Drömsamtalet covers, in their suggested order. The keys are
// stored in DreamConversation.state and used by the prompt's tool schema
// (lib/prompts/dreamConversation.ts); labels live in the "DreamConversation"
// i18n namespace (areaDream, areaProblem, ...).
export const DREAM_AREAS = ["dream", "problem", "why_you", "idea", "people", "conditions"] as const;
export type DreamArea = (typeof DREAM_AREAS)[number];

export type DreamState = {
  covered: DreamArea[];
  notes: Partial<Record<DreamArea, string>>;
};

function isDreamArea(v: unknown): v is DreamArea {
  return typeof v === "string" && (DREAM_AREAS as readonly string[]).includes(v);
}

// Lenient parse of the stored JSON (or of the model's tool input) — any
// unknown or malformed part is dropped rather than failing, same convention
// as coercePlanShape in the Idéverkstaden plan flow.
export function parseDreamState(raw: unknown): DreamState {
  const o = (raw ?? {}) as Record<string, unknown>;
  const covered = Array.isArray(o.covered) ? [...new Set(o.covered.filter(isDreamArea))] : [];
  const notesRaw = (o.notes ?? {}) as Record<string, unknown>;
  const notes: Partial<Record<DreamArea, string>> = {};
  for (const area of DREAM_AREAS) {
    const v = notesRaw[area];
    if (typeof v === "string" && v.trim()) notes[area] = v.trim();
  }
  return { covered: DREAM_AREAS.filter((a) => covered.includes(a)), notes };
}

export function parseOpenQuestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((q): q is string => typeof q === "string").map((q) => q.trim()).filter(Boolean))].slice(0, 20);
}

// A turn's update never loses ground: an area once covered stays covered,
// and a note the model omits this turn keeps its previous value. The model
// is asked for the full picture each turn, but this guards against a turn
// that forgets something.
export function mergeDreamState(previous: DreamState, update: DreamState): DreamState {
  const covered = DREAM_AREAS.filter((a) => previous.covered.includes(a) || update.covered.includes(a));
  return { covered, notes: { ...previous.notes, ...update.notes } };
}

export function isDreamComplete(state: DreamState): boolean {
  return DREAM_AREAS.every((a) => state.covered.includes(a));
}
