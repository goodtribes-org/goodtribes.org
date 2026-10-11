import { isWrittenPhaseWiki } from "@/lib/phaseWikiTemplates";

// Etablera (#329): get it running on its own, so it doesn't hang on a few
// enthusiasts. Four steps — how we do it (one document: who does what,
// routines, how someone new gets started, lessons), money that lasts, the
// partnerships and the people around the project — then the gate, where
// the review council can be asked for a review. Pure: the page, the
// signals and the gate read the same rules from here.

// Old ESTABLISH keys reused, so ticks and cards carry over.
export const ETABLERA_STEPS = ["playbook_documented", "stable_operations_funding", "partnerships_formalized", "supporter_base_built"] as const;
export type EtableraStep = (typeof ETABLERA_STEPS)[number];

export type EtableraData = {
  playbookHtml: string | null | undefined;
  fundingSecured: boolean;
  activePartnerships: number;
  supporterBaseNotes: string | null | undefined;
};

export function etableraStepsDone(d: EtableraData): Record<EtableraStep, boolean> {
  return {
    playbook_documented: isWrittenPhaseWiki("playbook", d.playbookHtml),
    stable_operations_funding: d.fundingSecured,
    partnerships_formalized: d.activePartnerships > 0,
    supporter_base_built: !!d.supporterBaseNotes?.trim(),
  };
}
