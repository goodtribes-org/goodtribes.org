export const VALUE_PROPOSITION_FIELDS = [
  "vpJobs",
  "vpPains",
  "vpGains",
  "vpProducts",
  "vpRelievers",
  "vpCreators",
] as const;

export type ValuePropositionField = (typeof VALUE_PROPOSITION_FIELDS)[number];

// side "value" = Value Map (what you offer), "customer" = Customer Profile
// (who you offer it to) — the two halves of Osterwalder's canvas. Labels
// reuse the "ValuePropositionHistory" namespace's fieldX keys, hints live
// under "ValuePropositionFields" hintX. See ValuePropositionGrid.tsx.
export const VALUE_PROPOSITION_BLOCKS: { field: ValuePropositionField; side: "value" | "customer"; translationKey: string }[] = [
  { field: "vpProducts", side: "value", translationKey: "Products" },
  { field: "vpRelievers", side: "value", translationKey: "Relievers" },
  { field: "vpCreators", side: "value", translationKey: "Creators" },
  { field: "vpJobs", side: "customer", translationKey: "Jobs" },
  { field: "vpPains", side: "customer", translationKey: "Pains" },
  { field: "vpGains", side: "customer", translationKey: "Gains" },
];
