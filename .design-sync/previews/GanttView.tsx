import { GanttView } from "goodtribes-frontend";

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const CARDS = [
  { id: "c1", title: "Designa ny hemsida", column: "DOING", priority: "high", startDate: daysFromNow(-10), dueDate: daysFromNow(5), assignee: { name: "Elin Karlsson" } },
  { id: "c2", title: "Sätta upp Meilisearch-index", column: "TODO", priority: "medium", startDate: daysFromNow(2), dueDate: daysFromNow(9), assignee: { name: "Mattias Holm" } },
  { id: "c3", title: "Skriva onboarding-guide", column: "BACKLOG", priority: "low", startDate: null, dueDate: daysFromNow(20), assignee: null },
  { id: "c4", title: "Granska PR #4", column: "REVIEW", priority: "medium", startDate: daysFromNow(-2), dueDate: daysFromNow(1), assignee: { name: "Anna Andersson" } },
  { id: "c5", title: "Deploya v1.2", column: "DONE", priority: "high", startDate: daysFromNow(-14), dueDate: daysFromNow(-7), assignee: { name: "Elin Karlsson" } },
];

const MILESTONES = [
  { id: "m1", title: "Lansering v1.2", dueDate: daysFromNow(-7), status: "done" },
  { id: "m2", title: "Kvartalsgenomgång", dueDate: daysFromNow(14), status: "open" },
];

const TODOS = [
  { id: "t1", title: "Boka lokal för workshop", dueDate: daysFromNow(6), done: false },
  { id: "t2", title: "Följ upp med ny volontär", dueDate: null, done: false },
];

export function Default() {
  return (
    <GanttView
      cards={CARDS}
      todos={TODOS}
      milestones={MILESTONES}
      projectSlug="demo-project"
      isOwnerOrAdmin={true}
      onUpdateCard={() => {}}
    />
  );
}

export function ReadOnly() {
  return (
    <GanttView
      cards={CARDS}
      todos={[]}
      milestones={MILESTONES}
      projectSlug="demo-project"
      isOwnerOrAdmin={false}
      onUpdateCard={() => {}}
    />
  );
}
