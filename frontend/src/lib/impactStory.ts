import type { NextStepDecision } from "@prisma/client";

// Impact (#334): show honestly what the project achieved, without
// administration, and decide what happens next. Five steps — your story
// (put together from what the project already has), a voice, who has seen
// it (a trust ladder, never a requirement), thank and share, what now.
// Pure: the page, the signals and the project page read the same rules.

// Old IMPACT keys reused where the meaning holds; "En röst" is new.
export const IMPACT_STEPS = ["sdg_impact_measured", "voice_shared", "impact_externally_verified", "results_celebrated", "next_step_decided"] as const;
export type ImpactStep = (typeof IMPACT_STEPS)[number];

const filled = (v: string | null | undefined) => !!v?.trim();

export type ImpactData = {
  followup: {
    story?: string | null;
    voiceQuote?: string | null;
    voiceConsent?: boolean | null;
    externalVerificationNotes?: string | null;
    celebrationNotes?: string | null;
    storySharedAt?: Date | null;
    nextStepDecision?: NextStepDecision | null;
  } | null;
  // DELIVERED reports only — a grant received is support in, not impact out.
  deliveredReports: number;
  verifiedDeliveredReports: number;
  // Partners who confirmed the story through a link (#336).
  partnerConfirmations?: number;
};

// A voice is shown only when the person said yes.
export function hasVoice(f: ImpactData["followup"]): boolean {
  return filled(f?.voiceQuote) && !!f?.voiceConsent;
}

// The trust ladder: 1 we tell, 2 participants tell, 3 someone else has
// seen it (the team says who, or a partner confirmed through a link — #336),
// 4 reviewed by GoodTribes. The highest rung reached counts; none
// is required. 0 = nothing told yet.
export type TrustLevel = 0 | 1 | 2 | 3 | 4;

export function trustLevel(d: ImpactData): TrustLevel {
  if (d.verifiedDeliveredReports > 0) return 4;
  if (filled(d.followup?.externalVerificationNotes) || (d.partnerConfirmations ?? 0) > 0) return 3;
  if (hasVoice(d.followup)) return 2;
  if (filled(d.followup?.story) || d.deliveredReports > 0) return 1;
  return 0;
}

export function impactStepsDone(d: ImpactData): Record<ImpactStep, boolean> {
  const f = d.followup;
  return {
    sdg_impact_measured: filled(f?.story) || d.deliveredReports > 0,
    voice_shared: hasVoice(f),
    impact_externally_verified: filled(f?.externalVerificationNotes) || d.verifiedDeliveredReports > 0 || (d.partnerConfirmations ?? 0) > 0,
    results_celebrated: !!f?.storySharedAt || filled(f?.celebrationNotes),
    next_step_decided: !!f?.nextStepDecision && f.nextStepDecision !== "UNDECIDED",
  };
}

type Metric = { label: string; unit: string; currentValue: number; updates: number };
type Report = { metricDescription: string; metricValue: number; metricUnit: string | null; valueQualifier: string; isCumulative: boolean };

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

// "Fyll i från projektets siffror": the story's start without AI — what the
// project already has, figures exactly as reported (never summed, a
// cumulative figure marked as such), the team's own monthly pulse sentences
// (#335, oldest first, already labelled with their month), headings for the
// team to fill in.
export function storyTemplate(
  t: { did: string; numbers: string; meant: string; next: string; cumulative: string; atLeast: string; approx: string; moments: string },
  metrics: Metric[],
  reports: Report[],
  moments: string[] = [],
): string {
  const numbers = [
    ...metrics.filter((m) => m.updates > 0).map((m) => `- ${m.label}: ${fmt(m.currentValue)} ${m.unit}`),
    ...reports.map(
      (r) =>
        `- ${r.metricDescription}: ${r.valueQualifier === "AT_LEAST" ? `${t.atLeast} ` : r.valueQualifier === "APPROXIMATE" ? `${t.approx} ` : ""}${fmt(r.metricValue)}${r.metricUnit ? ` ${r.metricUnit}` : ""}${r.isCumulative ? ` (${t.cumulative})` : ""}`,
    ),
  ];
  return [
    `${t.did}\n`,
    `${t.numbers}\n${numbers.join("\n") || "- "}`,
    ...(moments.length ? [`\n${t.moments}\n${moments.map((m) => `- ${m}`).join("\n")}`] : []),
    `\n${t.meant}\n`,
    `\n${t.next}\n`,
  ].join("\n");
}
