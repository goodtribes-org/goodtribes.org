export const PROJECT_STATUSES = [
  { value: "concept", label: "Concept", color: "bg-dry-sage/40 text-dark-slate/70" },
  { value: "prototype", label: "Prototype", color: "bg-yellow-100 text-yellow-800" },
  { value: "production", label: "In Production", color: "bg-blue-100 text-blue-800" },
  { value: "delivery", label: "Delivered", color: "bg-green-100 text-green-800" },
] as const;

export const PROJECT_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value, s.label])
);

export const PROJECT_STATUS_COLOR: Record<string, string> = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value, s.color])
);
