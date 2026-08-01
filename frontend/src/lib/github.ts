// Read-only GitHub REST client.
//
// IMPORTANT: every request in this module must be a GET. GitHub is the source of
// truth for synced cards and the app never writes back — this file is the single
// place where that could be violated, so keep it GET-only.
//
// The PAT is server-only. It must never be exposed through a NEXT_PUBLIC_ var or
// returned to the browser. "GITHUB_TOKEN" is deliberately not used as the name:
// it is reserved/auto-injected inside GitHub Actions and secrets cannot start
// with "GITHUB_".

const GITHUB_PAT = process.env.GITHUB_PAT ?? "";
const API = "https://api.github.com";
const MAX_PAGES = 5;
const PER_PAGE = 100;

export function isGithubConfigured(): boolean {
  return GITHUB_PAT.length > 0;
}

export interface RepoRef {
  owner: string;
  repo: string;
}

const NAME = /^[A-Za-z0-9._-]+$/;

/**
 * Accepts "owner/repo" or a github.com URL. Returns null for anything else so a
 * bad value degrades to "no integration" rather than blocking a form submit.
 *
 * A bare "owner/repo" must be exactly two segments — "a/b/c" is a typo, not a
 * repo. URLs may carry a trailing path so that pasting an issue or PR link
 * ("https://github.com/owner/repo/issues/5") still resolves to the repo.
 */
export function parseRepoInput(raw: string | null | undefined): RepoRef | null {
  const input = (raw ?? "").trim();
  if (!input) return null;

  const withoutHost = input
    .replace(/^git@github\.com:/i, "")
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  const wasUrl = withoutHost !== input;

  const parts = withoutHost.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  if (!wasUrl && parts.length !== 2) return null;

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  if (!NAME.test(owner) || !NAME.test(repo)) return null;

  return { owner, repo };
}

export function repoSlug(ref: RepoRef): string {
  return `${ref.owner}/${ref.repo}`;
}

export function repoUrl(ref: RepoRef): string {
  return `https://github.com/${ref.owner}/${ref.repo}`;
}

/** The subset of the GitHub issue payload we persist. */
export interface GithubIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  draft?: boolean;
  labels: ({ name?: string } | string)[];
  user: { login: string } | null;
  assignees: { login: string }[] | null;
  milestone: { due_on: string | null } | null;
  pull_request?: { merged_at: string | null };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export class GithubError extends Error {}

/**
 * GET /repos/{owner}/{repo}/issues — returns issues AND pull requests. An entry
 * is a PR iff it carries a `pull_request` object.
 *
 * `since` filters by updated_at for cheap incremental syncs. Paginates up to
 * MAX_PAGES; `truncated` reports whether more remained.
 *
 * Throws GithubError on failure so the caller can record it against the repo —
 * unlike the render-path helpers in this codebase, a silent null here would look
 * identical to "the repo has no issues".
 */
export async function fetchRepoItems(
  { owner, repo }: RepoRef,
  since?: Date | null
): Promise<{ items: GithubIssue[]; truncated: boolean }> {
  if (!isGithubConfigured()) throw new GithubError("GITHUB_PAT is not configured");

  const items: GithubIssue[] = [];
  let truncated = false;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(`${API}/repos/${owner}/${repo}/issues`);
    url.searchParams.set("state", "all");
    url.searchParams.set("sort", "updated");
    url.searchParams.set("direction", "asc");
    url.searchParams.set("per_page", String(PER_PAGE));
    url.searchParams.set("page", String(page));
    if (since) url.searchParams.set("since", since.toISOString());

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "goodtribes.org",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      if (res.status === 403 && remaining === "0") {
        throw new GithubError("GitHub rate limit exceeded");
      }
      if (res.status === 404) {
        throw new GithubError(`Repot ${owner}/${repo} hittades inte (eller saknar behörighet)`);
      }
      throw new GithubError(`GitHub svarade ${res.status}`);
    }

    const batch = (await res.json()) as GithubIssue[];
    items.push(...batch);

    if (batch.length < PER_PAGE) return { items, truncated: false };
    if (page === MAX_PAGES) truncated = true;
  }

  return { items, truncated };
}

export function labelNames(labels: GithubIssue["labels"]): string[] {
  return labels
    .map((l) => (typeof l === "string" ? l : l.name ?? ""))
    .filter(Boolean);
}
