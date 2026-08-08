export type TaskProgressCard = {
  column: string;
  subtasks: { done: boolean }[];
};

export type TaskProgress = { total: number; done: number };

// Canonical "task progress" for a project: every kanban card counts as one
// unit of work, plus one more unit per subtask on that card. A card counts
// as done only via its `column`, never inferred from its subtasks (a card
// can sit in DONE with unchecked subtasks, or vice versa).
//
// TodoItem/TodoList (see schema.prisma) are deliberately excluded from this
// metric — that model has no dedicated management UI anywhere in the app;
// its only surface today is due-date entries mixed into the project
// calendar (see the `(workspace)/calendar/page.tsx` query), not
// collaborative project work in the way kanban cards and their subtasks are.
// If TodoList ever gets a real UI, revisit whether it belongs here.
export function computeTaskProgress(cards: TaskProgressCard[]): TaskProgress {
  let total = 0;
  let done = 0;
  for (const card of cards) {
    total += 1 + card.subtasks.length;
    done += (card.column === "DONE" ? 1 : 0) + card.subtasks.filter((s) => s.done).length;
  }
  return { total, done };
}

// Batched variant for listing pages showing many projects at once (homepage,
// sandbox) — groups a single cross-project card fetch by `projectSlug` and
// reduces each group with `computeTaskProgress`, so the whole page costs one
// query instead of one per project.
export function computeTaskProgressByProject(
  cards: (TaskProgressCard & { projectSlug: string })[]
): Map<string, TaskProgress> {
  const bySlug = new Map<string, TaskProgressCard[]>();
  for (const card of cards) {
    const group = bySlug.get(card.projectSlug) ?? [];
    group.push(card);
    bySlug.set(card.projectSlug, group);
  }
  const result = new Map<string, TaskProgress>();
  for (const [slug, group] of bySlug) result.set(slug, computeTaskProgress(group));
  return result;
}
