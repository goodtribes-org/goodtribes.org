// Read-only GitHub client for mirroring a Projects V2 board into the kanban.
//
// IMPORTANT: every request in this module must be a read-only query. GraphQL is
// served over POST, so "GET only" is no longer the rule — the rule is that no
// GraphQL document here may ever contain a `mutation`. GitHub is the source of
// truth for synced cards and the app never writes back; this file is the single
// place where that could be violated, so keep it query-only.
//
// The PAT is server-only. It must never be exposed through a NEXT_PUBLIC_ var or
// returned to the browser. "GITHUB_TOKEN" is deliberately not used as the name:
// it is reserved/auto-injected inside GitHub Actions and secrets cannot start
// with "GITHUB_".
//
// Reading a ProjectV2 needs `read:project` on a classic PAT, or organisation
// "Projects: read" on a fine-grained one. Without it GitHub answers 200 with a
// populated `errors[]`, which githubGraphql() turns into a GithubError so the
// failure surfaces on the project's edit page instead of looking like an empty
// board.

const API = "https://api.github.com";
const MAX_PAGES = 5;
const PER_PAGE = 100;

/** Read at call time, not module load, so the value is never baked in. */
function pat(): string {
  return process.env.GITHUB_PAT ?? "";
}

export function isGithubConfigured(): boolean {
  return pat().length > 0;
}

export class GithubError extends Error {}

export type GithubOwnerType = "organization" | "user";

export interface ProjectRef {
  ownerLogin: string;
  ownerType: GithubOwnerType;
  projectNumber: number;
}

const NAME = /^[A-Za-z0-9._-]+$/;

/**
 * Accepts a Projects V2 board URL ("https://github.com/orgs/acme/projects/2",
 * or the /users/ variant) or a bare "acme/2". Returns null for anything else so
 * a bad value degrades to "no integration" rather than blocking a form submit.
 *
 * A bare owner/number can't tell an org from a user, so it defaults to
 * organization — fetchProjectBoard() falls back to the user root if that misses.
 */
export function parseProjectInput(raw: string | null | undefined): ProjectRef | null {
  const input = (raw ?? "").trim();
  if (!input) return null;

  const withoutHost = input.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  const parts = withoutHost.split(/[/?#]/).filter(Boolean);

  let ownerType: GithubOwnerType = "organization";
  let ownerLogin: string;
  let numberRaw: string;

  if (parts.length >= 4 && /^(orgs|users)$/i.test(parts[0]) && /^projects$/i.test(parts[2])) {
    ownerType = parts[0].toLowerCase() === "users" ? "user" : "organization";
    ownerLogin = parts[1];
    numberRaw = parts[3];
  } else if (parts.length === 2) {
    ownerLogin = parts[0];
    numberRaw = parts[1];
  } else {
    return null;
  }

  if (!NAME.test(ownerLogin)) return null;
  if (!/^\d+$/.test(numberRaw)) return null;
  const projectNumber = Number(numberRaw);
  if (projectNumber <= 0) return null;

  return { ownerLogin, ownerType, projectNumber };
}

export function projectUrl(ref: ProjectRef): string {
  const root = ref.ownerType === "user" ? "users" : "orgs";
  return `https://github.com/${root}/${ref.ownerLogin}/projects/${ref.projectNumber}`;
}

/** One item on the board, flattened from the ProjectV2 item + its content. */
export interface GithubBoardItem {
  /** ProjectV2 item node id — stable across repos, unlike the issue number. */
  itemId: string;
  /** Raw name of the board's Status field value, null when unset. */
  status: string | null;
  type: "issue" | "pull_request" | "draft";
  number: number | null;
  title: string;
  body: string | null;
  /** Lower-cased: "open" | "closed" | "merged". Null for draft issues. */
  state: string | null;
  merged: boolean;
  draft: boolean;
  url: string | null;
  repoName: string | null;
  author: string | null;
  assignees: string[];
  labels: string[];
  dueOn: string | null;
  updatedAt: string;
}

export interface StatusOption {
  id: string;
  name: string;
}

export interface ProjectBoard {
  nodeId: string;
  title: string;
  url: string;
  ownerType: GithubOwnerType;
  statusOptions: StatusOption[];
  items: GithubBoardItem[];
  /** True when the board has more items than MAX_PAGES could fetch. */
  truncated: boolean;
}

/**
 * POST a read-only GraphQL query. Never pass a `mutation` — see the file header.
 *
 * GitHub answers 200 with `errors[]` for things like a missing `read:project`
 * scope, so checking res.ok alone would silently report an empty board.
 */
async function githubGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  if (!isGithubConfigured()) throw new GithubError("GITHUB_PAT is not configured");

  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pat()}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "goodtribes.org",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (res.status === 403 && remaining === "0") {
      throw new GithubError("GitHub rate limit exceeded");
    }
    if (res.status === 401) {
      throw new GithubError("GITHUB_PAT avvisades av GitHub (401)");
    }
    throw new GithubError(`GitHub svarade ${res.status}`);
  }

  const payload = (await res.json()) as {
    data?: T;
    errors?: { message?: string }[];
  };

  if (payload.errors?.length) {
    const message = payload.errors.map((e) => e.message).filter(Boolean).join("; ");
    throw new GithubError(message || "GitHub GraphQL-fel");
  }
  if (!payload.data) throw new GithubError("GitHub svarade utan data");

  return payload.data;
}

const BOARD_FRAGMENT = `
  id
  title
  url
  field(name: "Status") {
    ... on ProjectV2SingleSelectField { id name options { id name } }
  }
  items(first: ${PER_PAGE}, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      isArchived
      fieldValueByName(name: "Status") {
        ... on ProjectV2ItemFieldSingleSelectValue { name }
      }
      content {
        __typename
        ... on DraftIssue { title body createdAt updatedAt }
        ... on Issue {
          number title body state url updatedAt
          repository { nameWithOwner }
          author { login }
          assignees(first: 10) { nodes { login } }
          labels(first: 10) { nodes { name } }
          milestone { dueOn }
        }
        ... on PullRequest {
          number title body state isDraft merged url updatedAt
          repository { nameWithOwner }
          author { login }
          assignees(first: 10) { nodes { login } }
          labels(first: 10) { nodes { name } }
          milestone { dueOn }
        }
      }
    }
  }
`;

const BOARD_QUERY = (root: GithubOwnerType) => `
  query($login: String!, $number: Int!, $cursor: String) {
    ${root === "user" ? "user" : "organization"}(login: $login) {
      projectV2(number: $number) {${BOARD_FRAGMENT}}
    }
  }
`;

interface RawProject {
  id: string;
  title: string;
  url: string;
  field: { id: string; name: string; options: StatusOption[] } | null;
  items: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: RawItem[];
  };
}

interface RawItem {
  id: string;
  isArchived: boolean;
  fieldValueByName: { name?: string } | null;
  content: {
    __typename: string;
    number?: number;
    title?: string;
    body?: string | null;
    state?: string;
    isDraft?: boolean;
    merged?: boolean;
    url?: string;
    updatedAt?: string;
    repository?: { nameWithOwner: string };
    author?: { login: string } | null;
    assignees?: { nodes: { login: string }[] };
    labels?: { nodes: { name: string }[] };
    milestone?: { dueOn: string | null } | null;
  } | null;
}

function normalizeItem(raw: RawItem): GithubBoardItem | null {
  const content = raw.content;
  // An item whose content the PAT can't see (private repo outside its scope)
  // comes back with content: null. Skipping beats importing a blank card.
  if (!content || !content.title) return null;

  const typename = content.__typename;
  const type: GithubBoardItem["type"] =
    typename === "PullRequest" ? "pull_request" : typename === "Issue" ? "issue" : "draft";

  return {
    itemId: raw.id,
    status: raw.fieldValueByName?.name ?? null,
    type,
    number: content.number ?? null,
    title: content.title,
    body: content.body ?? null,
    state: content.state ? content.state.toLowerCase() : null,
    merged: !!content.merged,
    draft: !!content.isDraft,
    url: content.url ?? null,
    repoName: content.repository?.nameWithOwner ?? null,
    author: content.author?.login ?? null,
    assignees: content.assignees?.nodes.map((a) => a.login) ?? [],
    labels: content.labels?.nodes.map((l) => l.name).filter(Boolean) ?? [],
    dueOn: content.milestone?.dueOn ?? null,
    updatedAt: content.updatedAt ?? new Date(0).toISOString(),
  };
}

/**
 * Fetch every item on a Projects V2 board along with its Status value.
 *
 * ProjectV2 items have no `since` filter, so this is always a full pass —
 * boards are small compared to an issue backlog. Pagination stops at MAX_PAGES
 * and reports `truncated`, which the sync uses to skip stale-card deletion.
 *
 * A board mapped as an organisation but actually owned by a user (or vice
 * versa) is retried once against the other root, and the resolved ownerType is
 * returned so the caller can persist it.
 *
 * Throws GithubError on failure so the caller can record it against the board —
 * a silent null here would look identical to "the board is empty".
 */
export async function fetchProjectBoard(ref: ProjectRef): Promise<ProjectBoard> {
  let ownerType = ref.ownerType;
  let project: RawProject | null = null;
  let primaryError: unknown = null;

  try {
    project = await fetchProjectPage(ownerType, ref, null);
  } catch (err) {
    // Held rather than thrown: a login that is a user, not an org, errors here
    // with "Could not resolve to an Organization" and the fallback below fixes
    // it. Anything else (a missing read:project scope, say) is rethrown once
    // the fallback has also failed, since its message is the useful one.
    primaryError = err;
  }

  if (!project) {
    const alternate: GithubOwnerType = ownerType === "user" ? "organization" : "user";
    try {
      const fallback = await fetchProjectPage(alternate, ref, null);
      if (fallback) {
        project = fallback;
        ownerType = alternate;
      }
    } catch {
      // Keep primaryError / the not-found message below.
    }
  }

  if (!project) {
    if (primaryError) throw primaryError;
    throw new GithubError(
      `Projektet ${ref.ownerLogin}/${ref.projectNumber} hittades inte (eller saknar behörighet)`
    );
  }

  const statusOptions = project.field?.options ?? [];
  const items: GithubBoardItem[] = [];
  let truncated = false;
  let page = project;

  for (let i = 1; ; i++) {
    for (const node of page.items.nodes) {
      if (node.isArchived) continue;
      const item = normalizeItem(node);
      if (item) items.push(item);
    }

    if (!page.items.pageInfo.hasNextPage) break;
    if (i >= MAX_PAGES) {
      truncated = true;
      break;
    }

    const next = await fetchProjectPage(ownerType, ref, page.items.pageInfo.endCursor);
    if (!next) break;
    page = next;
  }

  return {
    nodeId: project.id,
    title: project.title,
    url: project.url,
    ownerType,
    statusOptions,
    items,
    truncated,
  };
}

async function fetchProjectPage(
  ownerType: GithubOwnerType,
  ref: ProjectRef,
  cursor: string | null
): Promise<RawProject | null> {
  const data = await githubGraphql<{
    organization?: { projectV2: RawProject | null } | null;
    user?: { projectV2: RawProject | null } | null;
  }>(BOARD_QUERY(ownerType), {
    login: ref.ownerLogin,
    number: ref.projectNumber,
    cursor,
  });

  const owner = ownerType === "user" ? data.user : data.organization;
  return owner?.projectV2 ?? null;
}
