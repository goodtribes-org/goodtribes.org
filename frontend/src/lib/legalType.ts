// Juridisk form (PRD 4c) — replaces the old Project.commercial Boolean.
export const LEGAL_TYPES = [
  { value: "NONPROFIT_UMBRELLA", label: "Ideellt — under Stiftelsens paraply", commercial: false },
  { value: "NONPROFIT_OWN_ASSOC", label: "Ideellt — egen förening", commercial: false },
  { value: "COMMERCIAL_UMBRELLA", label: "Kommersiellt — paraply-AB", commercial: true },
  { value: "COMMERCIAL_AB", label: "Kommersiellt — eget helägt AB", commercial: true },
] as const;

export type LegalTypeValue = (typeof LEGAL_TYPES)[number]["value"];

export const LEGAL_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  LEGAL_TYPES.map((t) => [t.value, t.label])
);

const VALID_LEGAL_TYPE_VALUES: readonly string[] = LEGAL_TYPES.map((t) => t.value);

export function isValidLegalType(value: string): value is LegalTypeValue {
  return VALID_LEGAL_TYPE_VALUES.includes(value);
}

export function isCommercialLegalType(value: string): boolean {
  return value === "COMMERCIAL_UMBRELLA" || value === "COMMERCIAL_AB";
}
