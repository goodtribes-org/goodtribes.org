// Juridisk form (PRD 4c) — replaces the old Project.commercial Boolean.
// `creatable` marks the 2 values a founder can pick at project creation
// (Ideellt / Kommersiellt, both the paraply tier) — the other 2 remain
// valid, reachable-only-through-governance states via LegalTypeChangeRequest
// (see legal-type/actions.ts) once a project has graduated Sandbox.
export const LEGAL_TYPES = [
  { value: "NONPROFIT_UMBRELLA", label: "Ideellt — under Stiftelsens paraply", commercial: false, creatable: true },
  { value: "NONPROFIT_OWN_ASSOC", label: "Ideellt — egen förening", commercial: false, creatable: false },
  { value: "COMMERCIAL_UMBRELLA", label: "Kommersiellt — paraply-AB", commercial: true, creatable: true },
  { value: "COMMERCIAL_AB", label: "Kommersiellt — eget helägt AB", commercial: true, creatable: false },
] as const;

export type LegalTypeValue = (typeof LEGAL_TYPES)[number]["value"];

export const LEGAL_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  LEGAL_TYPES.map((t) => [t.value, t.label])
);

const VALID_LEGAL_TYPE_VALUES: readonly string[] = LEGAL_TYPES.map((t) => t.value);

export function isValidLegalType(value: string): value is LegalTypeValue {
  return VALID_LEGAL_TYPE_VALUES.includes(value);
}

export const CREATABLE_LEGAL_TYPES = LEGAL_TYPES.filter((t) => t.creatable);

const CREATABLE_LEGAL_TYPE_VALUES: readonly string[] = CREATABLE_LEGAL_TYPES.map((t) => t.value);

export function isCreatableLegalType(value: string): value is "NONPROFIT_UMBRELLA" | "COMMERCIAL_UMBRELLA" {
  return CREATABLE_LEGAL_TYPE_VALUES.includes(value);
}

export function isCommercialLegalType(value: string): boolean {
  return value === "COMMERCIAL_UMBRELLA" || value === "COMMERCIAL_AB";
}
