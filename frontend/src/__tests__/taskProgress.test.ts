import { computeTaskProgress, computeTaskProgressByProject } from "../lib/taskProgress";

// Canonical "task progress" metric for a project (project-detail page, other
// kanban summary widgets): every card is 1 unit + 1 per subtask, and a card
// counts as done only via its `column` field, never inferred from subtasks.
describe("computeTaskProgress", () => {
  it("returns zero total/done for an empty card list", () => {
    expect(computeTaskProgress([])).toEqual({ total: 0, done: 0 });
  });

  it("counts a card with no subtasks as 1 unit of work", () => {
    const result = computeTaskProgress([{ column: "TODO", subtasks: [] }]);
    expect(result).toEqual({ total: 1, done: 0 });
  });

  it("counts a card plus one unit per subtask", () => {
    const result = computeTaskProgress([
      { column: "TODO", subtasks: [{ done: false }, { done: false }, { done: false }] },
    ]);
    expect(result.total).toBe(4); // 1 card + 3 subtasks
  });

  it("counts a card as done only via its column, regardless of subtask state", () => {
    // Card in DONE column but with unchecked subtasks: the card unit counts
    // done, the subtask units don't.
    const doneCardUncheckedSubtasks = computeTaskProgress([
      { column: "DONE", subtasks: [{ done: false }, { done: false }] },
    ]);
    expect(doneCardUncheckedSubtasks).toEqual({ total: 3, done: 1 });

    // Card NOT in DONE column but all subtasks checked: the card unit does
    // NOT count done, even though every subtask does.
    const notDoneCardCheckedSubtasks = computeTaskProgress([
      { column: "IN_PROGRESS", subtasks: [{ done: true }, { done: true }] },
    ]);
    expect(notDoneCardCheckedSubtasks).toEqual({ total: 3, done: 2 });
  });

  it("counts a card in DONE with all subtasks done as fully done", () => {
    const result = computeTaskProgress([
      { column: "DONE", subtasks: [{ done: true }, { done: true }] },
    ]);
    expect(result).toEqual({ total: 3, done: 3 });
  });

  it("is case-sensitive / exact-match on the DONE column string", () => {
    const result = computeTaskProgress([{ column: "done", subtasks: [] }]);
    expect(result).toEqual({ total: 1, done: 0 });
  });

  it("aggregates totals and done counts across multiple cards", () => {
    const result = computeTaskProgress([
      { column: "DONE", subtasks: [{ done: true }, { done: false }] }, // total 3, done 2
      { column: "TODO", subtasks: [] }, // total 1, done 0
      { column: "IN_PROGRESS", subtasks: [{ done: true }] }, // total 2, done 1
    ]);
    expect(result).toEqual({ total: 6, done: 3 });
  });
});

describe("computeTaskProgressByProject", () => {
  it("returns an empty map for an empty card list", () => {
    expect(computeTaskProgressByProject([]).size).toBe(0);
  });

  it("groups cards by projectSlug and reduces each group independently", () => {
    const result = computeTaskProgressByProject([
      { projectSlug: "alpha", column: "DONE", subtasks: [] },
      { projectSlug: "alpha", column: "TODO", subtasks: [{ done: false }] },
      { projectSlug: "beta", column: "DONE", subtasks: [{ done: true }, { done: true }] },
    ]);

    expect(result.size).toBe(2);
    expect(result.get("alpha")).toEqual({ total: 3, done: 1 }); // 1 done card + 1 card w/ 1 subtask
    expect(result.get("beta")).toEqual({ total: 3, done: 3 });
  });

  it("does not create a map entry for a project with no cards", () => {
    const result = computeTaskProgressByProject([
      { projectSlug: "alpha", column: "DONE", subtasks: [] },
    ]);
    expect(result.has("gamma")).toBe(false);
  });
});
