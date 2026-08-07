// The board's columns. Lives in lib/ rather than in kanbanShared.tsx so server
// code — the GitHub sync in particular — can validate a column key without
// pulling a "use client" module into the server bundle. kanbanShared.tsx
// re-exports these, so every existing importer is unaffected.

export const COLUMNS = [
  { key: "BACKLOG", label: "Wishlist", color: "#ef4444" },
  { key: "TODO",    label: "ToDo",    color: "#f97316" },
  { key: "DOING",   label: "Doing",   color: "#facc15" },
  { key: "REVIEW",  label: "Review",  color: "#3b82f6" },
  { key: "DONE",    label: "Done",    color: "#16a34a" },
];

export const COLUMN_ORDER = COLUMNS.map((c) => c.key);

// `label` above stays the raw stored value; consumers should call
// t(COLUMN_LABEL_KEYS[key]) via the "KanbanShared" namespace for display.
export const COLUMN_LABEL_KEYS: Record<string, string> = {
  BACKLOG: "columnBacklog",
  TODO: "columnTodo",
  DOING: "columnDoing",
  REVIEW: "columnReview",
  DONE: "columnDone",
};

export function isColumnKey(value: unknown): value is string {
  return typeof value === "string" && COLUMN_ORDER.includes(value);
}
