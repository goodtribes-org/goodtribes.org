import type { ProvenanceInfo } from "@/lib/fieldProvenance";

// "Börja här" at the top of the Idé page, for someone who just got the whole
// phase filled in by the AI: what they said versus what the AI guessed, and
// the few guesses to look at first. Pure, so it can be tested; the page
// feeds it currentAssumptions() and each canvas's provenance.

// The guesses the whole idea rests on, most load-bearing first: who it's for,
// what they want, what they're trying to get done, the promise, how to reach
// them, and the first change it should make.
export const LOAD_BEARING_FIELDS = [
  "leanCanvas.customerSegments",
  "valueProposition.vpGains",
  "leanCanvas.jobsToBeDone",
  "leanCanvas.uniqueValueProposition",
  "leanCanvas.channels",
  "impactModel.shortTermOutcomes",
] as const;

export type Guess = { key: string; text: string };

// Unreviewed AI guesses to show, most load-bearing first — the field Kritikern
// flagged before everything else. A guess someone has answered (confirmed,
// or kept as an assumption to test) is reviewed and makes room for the next.
export function pickGuesses(
  assumptions: Guess[],
  provenance: Record<string, ProvenanceInfo | undefined>,
  flaggedField: string | null,
  count = 3,
): Guess[] {
  const unreviewed = assumptions.filter((a) => provenance[a.key]?.author === "AI");
  const rank = (key: string) => {
    if (key === flaggedField) return -1;
    const i = (LOAD_BEARING_FIELDS as readonly string[]).indexOf(key);
    return i === -1 ? LOAD_BEARING_FIELDS.length : i;
  };
  // Array.sort is stable, so fields outside the list keep the canvas order.
  return [...unreviewed].sort((a, b) => rank(a.key) - rank(b.key)).slice(0, count);
}

// Which section of the Idé page a canvas field lives in.
export function sectionAnchor(key: string): string {
  if (key.startsWith("valueProposition.")) return "vardeerbjudande";
  if (key.startsWith("impactModel.")) return "impactmodell";
  return "lean-canvas";
}
