import { after } from "next/server";
import type { ProjectGithubBoard } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  fetchProjectBoard,
  isGithubConfigured,
  type GithubBoardItem,
  type GithubOwnerType,
} from "@/lib/github";
import { columnForStatus, parseColumnMap } from "@/lib/githubColumnMap";

const MIN_SYNC_INTERVAL_MS = 4 * 60 * 1000; // skip boards synced very recently
const MAX_DESCRIPTION = 4000;

export const GITHUB_CARD_LOCKED_MESSAGE =
  "Kortet speglar GitHub och kan inte ändras här";

/**
 * Guard for every KanbanCard write path. Returns an error message if the card is
 * owned by the GitHub sync, otherwise null.
 *
 * GitHub is the source of truth for these cards: letting the app edit them would
 * just be overwritten on the next sync, so they are rejected outright.
 */
export async function assertNotGithubCard(cardId: string): Promise<string | null> {
  const card = await prisma.kanbanCard.findUnique({
    where: { id: cardId },
    select: { source: true },
  });
  return card?.source === "github" ? GITHUB_CARD_LOCKED_MESSAGE : null;
}

/** Same guard, addressed by subtask rather than card. */
export async function assertNotGithubSubtask(subtaskId: string): Promise<string | null> {
  const subtask = await prisma.kanbanCardSubtask.findUnique({
    where: { id: subtaskId },
    select: { card: { select: { source: true } } },
  });
  return subtask?.card.source === "github" ? GITHUB_CARD_LOCKED_MESSAGE : null;
}

/**
 * Where a board item lands:
 *   closed issue or merged PR -> DONE
 *   anything else             -> whatever its board Status maps to
 *
 * The closed/merged override exists because a finished item usually keeps
 * whatever Status it had when it was closed (this org's boards end at "test",
 * not at a "done" column), and leaving it there would park completed work in
 * Review forever.
 */
export function columnForItem(
  item: GithubBoardItem,
  overrides: Record<string, string> = {}
): string {
  if (item.state === "closed" || item.state === "merged" || item.merged) return "DONE";
  return columnForStatus(item.status, overrides);
}

export interface BoardSyncResult {
  projectSlug: string;
  synced: number;
  removed: number;
  error?: string;
}

/**
 * Pull a GitHub Projects V2 board's items into that project's KanbanCard rows.
 *
 * Always a full pass: ProjectV2 items carry no `since` filter, and a board is
 * small compared to a repo's issue history.
 *
 * Never throws — one broken board must not abort a whole cron run. Failures are
 * recorded on the board row and `lastSyncedAt` is deliberately left untouched so
 * the same window is retried next time.
 */
export async function syncProjectBoard(board: ProjectGithubBoard): Promise<BoardSyncResult> {
  const base: BoardSyncResult = { projectSlug: board.projectSlug, synced: 0, removed: 0 };

  if (!board.enabled) return base;
  if (!isGithubConfigured()) {
    return { ...base, error: "GITHUB_PAT is not configured" };
  }

  const project = await prisma.project.findUnique({
    where: { slug: board.projectSlug },
    select: { ownerId: true },
  });
  if (!project) return { ...base, error: "Project not found" };

  let fetched;
  try {
    fetched = await fetchProjectBoard({
      ownerLogin: board.ownerLogin,
      ownerType: board.ownerType as GithubOwnerType,
      projectNumber: board.projectNumber,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Okänt fel mot GitHub";
    await prisma.projectGithubBoard
      .update({ where: { id: board.id }, data: { lastSyncError: message } })
      .catch(() => {});
    return { ...base, error: message };
  }

  const overrides = parseColumnMap(board.columnMap);

  // Existing mirrored cards, keyed by ProjectV2 item id so we can tell create
  // from update. The issue number is not usable as a key: a board spans repos.
  const existing = await prisma.kanbanCard.findMany({
    where: { projectSlug: board.projectSlug, source: "github" },
    select: { id: true, githubItemId: true },
  });
  const byItemId = new Map(
    existing.flatMap((c) => (c.githubItemId === null ? [] : [[c.githubItemId, c] as const]))
  );

  // Highest order per column across ALL cards, so mirrored items append below
  // whatever the team has arranged manually. Items arrive in board order and
  // keep it: mirrored cards can't be dragged, so there is no manual order to
  // preserve and reassigning every pass keeps the two boards reading alike.
  const maxOrders = await prisma.kanbanCard.groupBy({
    by: ["column"],
    where: { projectSlug: board.projectSlug, source: { not: "github" } },
    _max: { order: true },
  });
  const nextOrder = new Map(maxOrders.map((m) => [m.column, (m._max.order ?? -1) + 1]));
  const takeOrder = (column: string) => {
    const value = nextOrder.get(column) ?? 0;
    nextOrder.set(column, value + 1);
    return value;
  };

  const seen = new Set<string>();

  // Order assignment (takeOrder) must happen synchronously in board order —
  // done here, up front, before any of the actual writes fire. The writes
  // themselves then run concurrently (Promise.allSettled, not a
  // $transaction([...]) array) so one bad item's write still only fails
  // that item, exactly like the previous sequential try/catch loop, just
  // without paying for N sequential round-trips to Postgres. Boards are
  // small compared to a repo's issue history (see the doc comment on
  // syncProjectBoard), so no concurrency cap is needed here.
  const writes = fetched.items.map((item) => {
    seen.add(item.itemId);
    const column = columnForItem(item, overrides);
    const prior = byItemId.get(item.itemId);

    // Written straight through with update/create rather than moveKanbanCard(),
    // so a card landing in DONE from GitHub mints no tokens and fires no
    // completion notification. That is deliberate: the work was not tracked here.
    const data = {
      title: item.title.slice(0, 500),
      description: item.body ? item.body.slice(0, MAX_DESCRIPTION) : null,
      column,
      order: takeOrder(column),
      dueDate: item.dueOn ? new Date(item.dueOn) : null,
      source: "github",
      githubItemId: item.itemId,
      githubRepoName: item.repoName,
      githubStatus: item.status,
      githubNumber: item.number,
      githubType: item.type,
      githubUrl: item.url,
      githubState: item.state,
      githubMerged: item.merged,
      githubDraft: item.draft,
      githubLabels: item.labels,
      githubAuthor: item.author,
      githubAssignees: item.assignees,
      githubUpdatedAt: new Date(item.updatedAt),
    };

    return prior
      ? prisma.kanbanCard.update({ where: { id: prior.id }, data })
      : prisma.kanbanCard.create({
          data: { ...data, projectSlug: board.projectSlug, createdById: project.ownerId },
        });
  });

  const writeResults = await Promise.allSettled(writes);
  const synced = writeResults.filter((r) => r.status === "fulfilled").length;

  // Every pass sees the whole board, so anything missing was removed from it,
  // deleted, or archived. Skipped when the item list was truncated, and only
  // ever touches source="github" rows.
  let removed = 0;
  if (!fetched.truncated) {
    const stale = existing.filter((c) => c.githubItemId !== null && !seen.has(c.githubItemId));
    if (stale.length > 0) {
      const res = await prisma.kanbanCard.deleteMany({
        where: { id: { in: stale.map((c) => c.id) }, source: "github" },
      });
      removed = res.count;
    }
  }

  await prisma.projectGithubBoard.update({
    where: { id: board.id },
    data: {
      lastSyncedAt: new Date(),
      lastSyncError: null,
      // Refreshed every pass so the column-mapping UI always offers the board's
      // live status list, and so a board renamed on GitHub relinks correctly.
      ownerType: fetched.ownerType,
      projectNodeId: fetched.nodeId,
      projectTitle: fetched.title,
      projectUrl: fetched.url,
      // Mapped to plain literals: Prisma's InputJsonValue needs an index
      // signature, which the StatusOption interface doesn't carry.
      statusOptions: fetched.statusOptions.map((o) => ({ id: o.id, name: o.name })),
    },
  });

  return { projectSlug: board.projectSlug, synced, removed };
}

/** Sync every enabled board mapping. Used by the cron endpoint. */
const SYNC_LOCK_KEY = "lock:github-sync";

/**
 * Guards against two syncAllProjectBoards() runs overlapping — a real risk
 * since the cron fires every 5 minutes but a slow pass over many/large
 * boards could take longer than that. The lock's TTL matches
 * MIN_SYNC_INTERVAL_MS so a crashed run (which would otherwise never call
 * the release below) can't wedge every future run indefinitely.
 */
async function withSyncLock<T>(fn: () => Promise<T>): Promise<T | null> {
  // Imported lazily so pulling in this module's pure helpers (columnForItem,
  // assertNotGithubCard, etc. — used from plain kanban actions with nothing
  // to do with syncing) never opens a Redis connection as a side effect.
  const { redisPub } = await import("@/lib/redis");
  const acquired = await redisPub.set(
    SYNC_LOCK_KEY,
    "1",
    "PX",
    MIN_SYNC_INTERVAL_MS,
    "NX"
  );
  if (!acquired) return null;
  try {
    return await fn();
  } finally {
    await redisPub.del(SYNC_LOCK_KEY).catch(() => {});
  }
}

export async function syncAllProjectBoards(): Promise<{
  boards: number;
  results: BoardSyncResult[];
}> {
  const result = await withSyncLock(async () => {
    const cutoff = new Date(Date.now() - MIN_SYNC_INTERVAL_MS);
    const boards = await prisma.projectGithubBoard.findMany({
      where: {
        enabled: true,
        OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: cutoff } }],
      },
    });

    const results: BoardSyncResult[] = [];
    for (const board of boards) {
      results.push(await syncProjectBoard(board));
    }
    return { boards: boards.length, results };
  });

  // Another run already holds the lock — report zero rather than blocking,
  // since the caller (the cron route) doesn't need to wait for it.
  return result ?? { boards: 0, results: [] };
}

/**
 * Sync right after a board is mapped or its column mapping changes, so the board
 * is populated immediately instead of after the next cron tick.
 *
 * Scheduled with after() rather than left as a floating promise: work started in
 * a server action is not guaranteed to survive the response, and this call takes
 * seconds against a large board.
 */
export function syncProjectBoardInBackground(board: ProjectGithubBoard): void {
  after(async () => {
    await syncProjectBoard(board).catch(() => {});
  });
}
