import { after } from "next/server";
import type { ProjectGithubRepo } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  fetchRepoItems,
  isGithubConfigured,
  labelNames,
  type GithubIssue,
} from "@/lib/github";

const FULL_SYNC_INTERVAL_MS = 60 * 60 * 1000; // full pass once an hour
const MIN_SYNC_INTERVAL_MS = 4 * 60 * 1000; // skip repos synced very recently
const SINCE_OVERLAP_MS = 60 * 1000; // re-fetch a minute of overlap for clock skew
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
 * Where a GitHub item lands on the board:
 *   closed or merged          -> DONE
 *   open pull request         -> REVIEW
 *   open issue, assigned      -> DOING
 *   open issue, unassigned    -> BACKLOG
 */
export function columnForItem(item: GithubIssue): string {
  const isPr = !!item.pull_request;
  if (item.state === "closed" || item.pull_request?.merged_at) return "DONE";
  if (isPr) return "REVIEW";
  return (item.assignees?.length ?? 0) > 0 ? "DOING" : "BACKLOG";
}

export interface RepoSyncResult {
  projectSlug: string;
  synced: number;
  removed: number;
  full: boolean;
  error?: string;
}

/**
 * Pull a repo's issues and pull requests into that project's KanbanCard rows.
 *
 * Never throws — one broken repo must not abort a whole cron run. Failures are
 * recorded on the repo row and `lastSyncedAt` is deliberately left untouched so
 * the same window is retried next time.
 */
export async function syncProjectRepo(repo: ProjectGithubRepo): Promise<RepoSyncResult> {
  const base: RepoSyncResult = {
    projectSlug: repo.projectSlug,
    synced: 0,
    removed: 0,
    full: false,
  };

  if (!repo.enabled) return base;
  if (!isGithubConfigured()) {
    return { ...base, error: "GITHUB_PAT is not configured" };
  }

  const project = await prisma.project.findUnique({
    where: { slug: repo.projectSlug },
    select: { ownerId: true },
  });
  if (!project) return { ...base, error: "Project not found" };

  const now = new Date();
  const isFull =
    !repo.lastSyncedAt ||
    !repo.lastFullSyncAt ||
    now.getTime() - repo.lastFullSyncAt.getTime() > FULL_SYNC_INTERVAL_MS;

  const since =
    isFull || !repo.lastSyncedAt
      ? null
      : new Date(repo.lastSyncedAt.getTime() - SINCE_OVERLAP_MS);

  let items: GithubIssue[];
  let truncated: boolean;
  try {
    ({ items, truncated } = await fetchRepoItems(
      { owner: repo.owner, repo: repo.repo },
      since
    ));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Okänt fel mot GitHub";
    await prisma.projectGithubRepo
      .update({ where: { id: repo.id }, data: { lastSyncError: message } })
      .catch(() => {});
    return { ...base, full: isFull, error: message };
  }

  // Existing synced cards, so we can tell create from update and only shuffle
  // `order` when an item actually changes column.
  const existing = await prisma.kanbanCard.findMany({
    where: { projectSlug: repo.projectSlug, source: "github" },
    select: { id: true, githubNumber: true, column: true },
  });
  const byNumber = new Map(
    existing.flatMap((c) => (c.githubNumber === null ? [] : [[c.githubNumber, c] as const]))
  );

  // Highest order per column across ALL cards, so synced items append below
  // whatever the team has arranged manually.
  const maxOrders = await prisma.kanbanCard.groupBy({
    by: ["column"],
    where: { projectSlug: repo.projectSlug },
    _max: { order: true },
  });
  const nextOrder = new Map(maxOrders.map((m) => [m.column, (m._max.order ?? -1) + 1]));
  const takeOrder = (column: string) => {
    const value = nextOrder.get(column) ?? 0;
    nextOrder.set(column, value + 1);
    return value;
  };

  let synced = 0;
  const seen = new Set<number>();

  for (const item of items) {
    seen.add(item.number);
    const column = columnForItem(item);
    const prior = byNumber.get(item.number);

    const data = {
      title: item.title.slice(0, 500),
      description: item.body ? item.body.slice(0, MAX_DESCRIPTION) : null,
      column,
      dueDate: item.milestone?.due_on ? new Date(item.milestone.due_on) : null,
      source: "github",
      githubNumber: item.number,
      githubType: item.pull_request ? "pull_request" : "issue",
      githubUrl: item.html_url,
      githubState: item.state,
      githubMerged: !!item.pull_request?.merged_at,
      githubDraft: !!item.draft,
      githubLabels: labelNames(item.labels),
      githubAuthor: item.user?.login ?? null,
      githubAssignees: (item.assignees ?? []).map((a) => a.login),
      githubUpdatedAt: new Date(item.updated_at),
    };

    try {
      if (prior) {
        await prisma.kanbanCard.update({
          where: { id: prior.id },
          data: prior.column === column ? data : { ...data, order: takeOrder(column) },
        });
      } else {
        await prisma.kanbanCard.create({
          data: {
            ...data,
            projectSlug: repo.projectSlug,
            createdById: project.ownerId,
            order: takeOrder(column),
          },
        });
      }
      synced++;
    } catch {
      // Skip the individual item; the rest of the repo still syncs.
    }
  }

  // A full pass sees every open and closed item, so anything missing was deleted
  // or transferred on GitHub. Only ever touches source="github" rows.
  let removed = 0;
  if (isFull && !truncated) {
    const stale = existing.filter((c) => c.githubNumber !== null && !seen.has(c.githubNumber));
    if (stale.length > 0) {
      const res = await prisma.kanbanCard.deleteMany({
        where: { id: { in: stale.map((c) => c.id) }, source: "github" },
      });
      removed = res.count;
    }
  }

  await prisma.projectGithubRepo.update({
    where: { id: repo.id },
    data: {
      lastSyncedAt: now,
      lastSyncError: null,
      ...(isFull && !truncated ? { lastFullSyncAt: now } : {}),
    },
  });

  return { projectSlug: repo.projectSlug, synced, removed, full: isFull };
}

/** Sync every enabled repo mapping. Used by the cron endpoint. */
export async function syncAllProjectRepos(): Promise<{
  repos: number;
  results: RepoSyncResult[];
}> {
  const cutoff = new Date(Date.now() - MIN_SYNC_INTERVAL_MS);
  const repos = await prisma.projectGithubRepo.findMany({
    where: {
      enabled: true,
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: cutoff } }],
    },
  });

  const results: RepoSyncResult[] = [];
  for (const repo of repos) {
    results.push(await syncProjectRepo(repo));
  }
  return { repos: repos.length, results };
}

/**
 * Sync right after a repo is mapped, so the board is populated immediately
 * instead of after the next cron tick.
 *
 * Scheduled with after() rather than left as a floating promise: work started in
 * a server action is not guaranteed to survive the response, and this call takes
 * seconds against a large repo.
 */
export function syncProjectRepoInBackground(repo: ProjectGithubRepo): void {
  after(async () => {
    await syncProjectRepo(repo).catch(() => {});
  });
}
