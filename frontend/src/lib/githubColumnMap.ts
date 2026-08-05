// Which board column a GitHub Projects V2 "Status" value lands in.
//
// The web board keeps its own five columns (Wishlist/ToDo/Doing/Review/Done)
// because DONE carries real meaning here — token payouts, the lead-approval
// gate, completion percentages. GitHub's statuses are mapped onto them instead
// of replacing them.

import { COLUMN_ORDER, isColumnKey } from "@/lib/kanbanColumns";

export const FALLBACK_COLUMN = "BACKLOG";

/**
 * Built-in mapping, keyed by lower-cased status name.
 *
 * The first block is this org's agent workflow (new → request → plan → review →
 * apply → test, see the boards under github.com/orgs/goodtribes-org/projects).
 * Note that its "review" means "a written plan awaiting human approval" and
 * "test" means "PR open, awaiting verification" — both are review-ish here,
 * while "apply" is the stage where an agent is actually implementing.
 *
 * The second block covers GitHub's stock board templates so a project pointed
 * at an unrelated board still lands sensibly. Anything unrecognised falls back
 * to Wishlist, and a project can override any of it via ProjectGithubBoard.columnMap.
 */
export const DEFAULT_STATUS_COLUMN: Record<string, string> = {
  new: "BACKLOG",
  request: "BACKLOG",
  plan: "TODO",
  review: "REVIEW",
  apply: "DOING",
  test: "REVIEW",

  backlog: "BACKLOG",
  triage: "BACKLOG",
  icebox: "BACKLOG",
  todo: "TODO",
  "to do": "TODO",
  ready: "TODO",
  planned: "TODO",
  doing: "DOING",
  "in progress": "DOING",
  "in review": "REVIEW",
  "in test": "REVIEW",
  testing: "REVIEW",
  done: "DONE",
  shipped: "DONE",
  closed: "DONE",
};

function normalize(status: string): string {
  return status.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Read the stored overrides off a ProjectGithubBoard.columnMap JSON value.
 *
 * Entries naming a column that doesn't exist are dropped rather than trusted:
 * a stale mapping left over from a renamed column would otherwise strand cards
 * in a column the board never renders.
 */
export function parseColumnMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [status, column] of Object.entries(raw as Record<string, unknown>)) {
    if (isColumnKey(column)) out[normalize(status)] = column;
  }
  return out;
}

/**
 * Read the board's status list off ProjectGithubBoard.statusOptions JSON.
 *
 * Empty until the first successful sync, which is why the mapping UI only
 * appears once a board has actually been fetched.
 */
export function parseStatusOptions(raw: unknown): { id: string; name: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { id, name } = entry as { id?: unknown; name?: unknown };
    if (typeof id !== "string" || typeof name !== "string" || !name) return [];
    return [{ id, name }];
  });
}

/** Where a status lands: project override, then the built-in map, then Wishlist. */
export function columnForStatus(
  status: string | null | undefined,
  overrides: Record<string, string> = {}
): string {
  if (!status) return FALLBACK_COLUMN;
  const key = normalize(status);
  return overrides[key] ?? DEFAULT_STATUS_COLUMN[key] ?? FALLBACK_COLUMN;
}

export { COLUMN_ORDER };
