/**
 * fetchProjectBoard() against stubbed GraphQL responses.
 *
 * The payload shapes here are trimmed copies of real responses from
 * https://github.com/orgs/goodtribes-org/projects/2, so this covers the field
 * flattening that only shows up once the app talks to GitHub for real.
 */

import { fetchProjectBoard, GithubError } from "@/lib/github";

const OLD_PAT = process.env.GITHUB_PAT;

beforeAll(() => {
  process.env.GITHUB_PAT = "test-pat";
});

afterAll(() => {
  process.env.GITHUB_PAT = OLD_PAT;
});

type Json = Record<string, unknown>;

function respond(...payloads: Json[]) {
  const fetchMock = jest.fn();
  for (const payload of payloads) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => payload,
    });
  }
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function orgProject(nodes: Json[], hasNextPage = false, endCursor: string | null = null): Json {
  return {
    data: {
      organization: {
        projectV2: {
          id: "PVT_1",
          title: "goodtribes.org",
          url: "https://github.com/orgs/goodtribes-org/projects/2",
          field: {
            id: "PVTSSF_1",
            name: "Status",
            options: [
              { id: "a", name: "new" },
              { id: "b", name: "apply" },
            ],
          },
          items: { pageInfo: { hasNextPage, endCursor }, nodes },
        },
      },
    },
  };
}

const ISSUE_NODE: Json = {
  id: "PVTI_1",
  isArchived: false,
  fieldValueByName: { name: "review" },
  content: {
    __typename: "Issue",
    number: 5,
    title: "[Feature] User public skill profile",
    body: "### Project",
    state: "OPEN",
    url: "https://github.com/goodtribes-org/deploy/issues/5",
    updatedAt: "2026-08-03T18:57:33Z",
    repository: { nameWithOwner: "goodtribes-org/deploy" },
    author: { login: "mattiashem" },
    assignees: { nodes: [] },
    labels: { nodes: [{ name: "goodtribes.org" }, { name: "review" }] },
    milestone: null,
  },
};

const REF = { ownerLogin: "goodtribes-org", ownerType: "organization" as const, projectNumber: 2 };

describe("fetchProjectBoard", () => {
  it("flattens an issue item and the board's status options", async () => {
    respond(orgProject([ISSUE_NODE]));

    const board = await fetchProjectBoard(REF);

    expect(board.nodeId).toBe("PVT_1");
    expect(board.url).toBe("https://github.com/orgs/goodtribes-org/projects/2");
    expect(board.statusOptions).toEqual([
      { id: "a", name: "new" },
      { id: "b", name: "apply" },
    ]);
    expect(board.truncated).toBe(false);
    expect(board.items).toEqual([
      {
        itemId: "PVTI_1",
        status: "review",
        type: "issue",
        number: 5,
        title: "[Feature] User public skill profile",
        body: "### Project",
        state: "open",
        merged: false,
        draft: false,
        url: "https://github.com/goodtribes-org/deploy/issues/5",
        repoName: "goodtribes-org/deploy",
        author: "mattiashem",
        assignees: [],
        labels: ["goodtribes.org", "review"],
        dueOn: null,
        updatedAt: "2026-08-03T18:57:33Z",
      },
    ]);
  });

  it("flattens a merged pull request and a draft issue", async () => {
    respond(
      orgProject([
        {
          id: "PVTI_2",
          isArchived: false,
          fieldValueByName: { name: "test" },
          content: {
            __typename: "PullRequest",
            number: 12,
            title: "Add menu",
            body: null,
            state: "MERGED",
            isDraft: false,
            merged: true,
            url: "https://github.com/goodtribes-org/deploy/pull/12",
            updatedAt: "2026-08-04T10:00:00Z",
            repository: { nameWithOwner: "goodtribes-org/deploy" },
            author: { login: "mattiashem" },
            assignees: { nodes: [{ login: "mattiashem" }] },
            labels: { nodes: [] },
            milestone: { dueOn: "2026-09-01T00:00:00Z" },
          },
        },
        {
          id: "PVTI_3",
          isArchived: false,
          fieldValueByName: null,
          content: {
            __typename: "DraftIssue",
            title: "Idea without an issue",
            body: null,
            updatedAt: "2026-08-04T11:00:00Z",
          },
        },
      ])
    );

    const board = await fetchProjectBoard(REF);

    expect(board.items[0]).toMatchObject({
      type: "pull_request",
      state: "merged",
      merged: true,
      dueOn: "2026-09-01T00:00:00Z",
      assignees: ["mattiashem"],
    });
    expect(board.items[1]).toMatchObject({
      type: "draft",
      status: null,
      number: null,
      state: null,
      url: null,
      repoName: null,
    });
  });

  it("skips archived items and items whose content the PAT can't see", async () => {
    respond(
      orgProject([
        { ...ISSUE_NODE, id: "PVTI_archived", isArchived: true },
        { id: "PVTI_hidden", isArchived: false, fieldValueByName: null, content: null },
        ISSUE_NODE,
      ])
    );

    const board = await fetchProjectBoard(REF);
    expect(board.items.map((i) => i.itemId)).toEqual(["PVTI_1"]);
  });

  it("follows pagination until the last page", async () => {
    const fetchMock = respond(
      orgProject([ISSUE_NODE], true, "CURSOR_1"),
      orgProject([{ ...ISSUE_NODE, id: "PVTI_9" }])
    );

    const board = await fetchProjectBoard(REF);

    expect(board.items.map((i) => i.itemId)).toEqual(["PVTI_1", "PVTI_9"]);
    expect(board.truncated).toBe(false);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).variables.cursor).toBe("CURSOR_1");
  });

  it("falls back to the user root when the login is not an organisation", async () => {
    const fetchMock = respond(
      { data: { organization: null }, errors: [{ message: "Could not resolve to an Organization" }] },
      {
        data: {
          user: {
            projectV2: {
              id: "PVT_u",
              title: "personal",
              url: "https://github.com/users/mattiashem/projects/1",
              field: null,
              items: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] },
            },
          },
        },
      }
    );

    const board = await fetchProjectBoard(REF);

    expect(board.ownerType).toBe("user");
    expect(board.statusOptions).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("surfaces a GraphQL error when both roots fail", async () => {
    respond(
      { errors: [{ message: "Resource not accessible by personal access token" }] },
      { errors: [{ message: "Could not resolve to a User" }] }
    );

    // The primary root's message is the useful one — a missing read:project
    // scope must not be reported as "user not found".
    await expect(fetchProjectBoard(REF)).rejects.toThrow(
      new GithubError("Resource not accessible by personal access token")
    );
  });

  it("reports a board that simply does not exist", async () => {
    respond(orgProjectMissing(), orgProjectMissing());
    await expect(fetchProjectBoard(REF)).rejects.toThrow(GithubError);
  });
});

function orgProjectMissing(): Json {
  return { data: { organization: { projectV2: null }, user: { projectV2: null } } };
}
