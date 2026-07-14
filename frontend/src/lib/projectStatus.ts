// User-editable lifecycle stages, shown in the status dropdown and stage filter.
export const PROJECT_STATUSES = [
  { value: "CONCEPT", label: "Concept", color: "bg-dry-sage/40 text-dark-slate/70" },
  { value: "PROTOTYPE", label: "Prototype", color: "bg-yellow-100 text-yellow-800" },
  { value: "PRODUCTION", label: "In Production", color: "bg-blue-100 text-blue-800" },
  { value: "DELIVERY", label: "Delivered", color: "bg-green-100 text-green-800" },
] as const;

// Terminal state set only via the dedicated archive action (not user-selectable
// in the edit form), but a real, persisted value — must be included in any
// label/color lookup or display of an arbitrary project's status.
const ARCHIVED_STATUS = { value: "ARCHIVED", label: "Archived", color: "bg-gray-200 text-gray-600" } as const;

export const ALL_PROJECT_STATUSES = [...PROJECT_STATUSES, ARCHIVED_STATUS] as const;

export type ProjectStatusValue = (typeof ALL_PROJECT_STATUSES)[number]["value"];

export const PROJECT_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  ALL_PROJECT_STATUSES.map((s) => [s.value, s.label])
);

export const PROJECT_STATUS_COLOR: Record<string, string> = Object.fromEntries(
  ALL_PROJECT_STATUSES.map((s) => [s.value, s.color])
);

const VALID_PROJECT_STATUS_VALUES: readonly string[] = ALL_PROJECT_STATUSES.map((s) => s.value);

export function isValidProjectStatus(value: string): value is ProjectStatusValue {
  return VALID_PROJECT_STATUS_VALUES.includes(value);
}
