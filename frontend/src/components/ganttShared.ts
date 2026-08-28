// Shared types/constants/helpers between GanttView.tsx and
// GanttUnscheduledSection.tsx — pulled out to a plain module (no "use client",
// no component code) so the two components don't import from each other
// directly and create a circular dependency.

export type GanttCard = {
  id: string;
  title: string;
  column: string;
  priority: string;
  startDate: Date | string | null;
  dueDate: Date | string | null;
  description?: string | null;
  assignee?: { name: string | null } | null;
  dependsOnIds?: string[];
};

export type GanttTodo = {
  id: string;
  title: string;
  dueDate: Date | string | null;
  done: boolean;
};

export const COLUMN_LABEL_KEYS: Record<string, string> = {
  BACKLOG: "columnBacklog",
  TODO: "columnTodo",
  DOING: "columnDoing",
  REVIEW: "columnReview",
  DONE: "columnDone",
};

export const COLUMN_COLORS: Record<string, string> = {
  BACKLOG: "bg-gray-400",
  TODO: "bg-sky-500",
  DOING: "bg-amber-500",
  REVIEW: "bg-purple-500",
  DONE: "bg-green-500",
};

export function toDate(d: Date | string | null): Date | null {
  if (!d) return null;
  return d instanceof Date ? d : new Date(d);
}
