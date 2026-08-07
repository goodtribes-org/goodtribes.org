// Plain data, no "use client" — importable from both client components
// (kanbanShared.tsx re-exports these) and server actions (kanban/actions.ts),
// unlike kanbanShared.tsx itself which can't be imported from server code.
// `label` stays the DB-stored value's raw Swedish; consumers should call
// t(CATEGORY_LABEL_KEYS[key]) via the "KanbanShared" namespace for display.
export const CATEGORY_META: Record<string, { label: string; bg: string; text: string; hex: string }> = {
  teknik:         { label: "Teknik",        bg: "bg-blue-100",   text: "text-blue-700",   hex: "#3b82f6" },
  design:         { label: "Design",        bg: "bg-pink-100",   text: "text-pink-700",   hex: "#ec4899" },
  ekonomi:        { label: "Ekonomi",       bg: "bg-emerald-100",text: "text-emerald-700",hex: "#10b981" },
  strategi:       { label: "Strategi",      bg: "bg-amber-100",  text: "text-amber-700",  hex: "#f59e0b" },
  administration: { label: "Admin",         bg: "bg-slate-100",  text: "text-slate-600",  hex: "#64748b" },
  community:      { label: "Community",     bg: "bg-orange-100", text: "text-orange-700", hex: "#f97316" },
};

export const CATEGORY_LABEL_KEYS: Record<string, string> = {
  teknik: "categoryTeknik",
  design: "categoryDesign",
  ekonomi: "categoryEkonomi",
  strategi: "categoryStrategi",
  administration: "categoryAdministration",
  community: "categoryCommunity",
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_META);

export function isValidCategory(value: string): boolean {
  return CATEGORY_ORDER.includes(value);
}
