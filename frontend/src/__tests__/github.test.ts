import { parseProjectInput } from "@/lib/github";
import { columnForItem } from "@/lib/githubSync";
import { columnForStatus, parseColumnMap, parseStatusOptions } from "@/lib/githubColumnMap";
import type { GithubBoardItem } from "@/lib/github";

function item(overrides: Partial<GithubBoardItem> = {}): GithubBoardItem {
  return {
    itemId: "PVTI_1",
    status: null,
    type: "issue",
    number: 1,
    title: "t",
    body: null,
    state: "open",
    merged: false,
    draft: false,
    url: "https://github.com/o/r/issues/1",
    repoName: "o/r",
    author: null,
    assignees: [],
    labels: [],
    dueOn: null,
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("parseProjectInput", () => {
  it("accepts an org board URL", () => {
    expect(parseProjectInput("https://github.com/orgs/goodtribes-org/projects/2")).toEqual({
      ownerLogin: "goodtribes-org",
      ownerType: "organization",
      projectNumber: 2,
    });
  });

  it("accepts a user board URL", () => {
    expect(parseProjectInput("https://github.com/users/mattiashem/projects/7")).toEqual({
      ownerLogin: "mattiashem",
      ownerType: "user",
      projectNumber: 7,
    });
  });

  it("accepts a board URL with a trailing view path or query", () => {
    expect(parseProjectInput("https://github.com/orgs/goodtribes-org/projects/2/views/1")).toEqual({
      ownerLogin: "goodtribes-org",
      ownerType: "organization",
      projectNumber: 2,
    });
    expect(parseProjectInput("https://github.com/orgs/goodtribes-org/projects/2?pane=issue")).toEqual({
      ownerLogin: "goodtribes-org",
      ownerType: "organization",
      projectNumber: 2,
    });
  });

  it("accepts bare owner/number and assumes an organisation", () => {
    expect(parseProjectInput("goodtribes-org/4")).toEqual({
      ownerLogin: "goodtribes-org",
      ownerType: "organization",
      projectNumber: 4,
    });
  });

  it("rejects blank, malformed and repo-shaped input", () => {
    for (const bad of [
      "",
      "   ",
      null,
      undefined,
      "goodtribes-org",
      "goodtribes-org/deploy",
      "https://github.com/orgs/goodtribes-org/projects/abc",
      "https://github.com/goodtribes-org/deploy/issues/5",
      "own er/2",
      "goodtribes-org/0",
    ]) {
      expect(parseProjectInput(bad)).toBeNull();
    }
  });
});

describe("columnForStatus", () => {
  it("maps this org's six board statuses", () => {
    expect(columnForStatus("new")).toBe("BACKLOG");
    expect(columnForStatus("request")).toBe("BACKLOG");
    expect(columnForStatus("plan")).toBe("TODO");
    expect(columnForStatus("review")).toBe("REVIEW");
    expect(columnForStatus("apply")).toBe("DOING");
    expect(columnForStatus("test")).toBe("REVIEW");
  });

  it("maps GitHub's stock template statuses", () => {
    expect(columnForStatus("Todo")).toBe("TODO");
    expect(columnForStatus("In Progress")).toBe("DOING");
    expect(columnForStatus("Done")).toBe("DONE");
  });

  it("ignores case and surrounding or repeated whitespace", () => {
    expect(columnForStatus("  In   PROGRESS ")).toBe("DOING");
  });

  it("falls back to BACKLOG for an unknown or unset status", () => {
    expect(columnForStatus("waiting on legal")).toBe("BACKLOG");
    expect(columnForStatus(null)).toBe("BACKLOG");
    expect(columnForStatus("")).toBe("BACKLOG");
  });

  it("lets a project override beat the built-in map", () => {
    expect(columnForStatus("test", { test: "DONE" })).toBe("DONE");
  });
});

describe("parseColumnMap", () => {
  it("normalizes keys and drops entries naming a column that doesn't exist", () => {
    expect(parseColumnMap({ " Test ": "DONE", plan: "ARCHIVE", apply: "DOING" })).toEqual({
      test: "DONE",
      apply: "DOING",
    });
  });

  it("returns an empty map for non-object input", () => {
    for (const bad of [null, undefined, [], "DONE", 4]) {
      expect(parseColumnMap(bad)).toEqual({});
    }
  });
});

describe("parseStatusOptions", () => {
  it("keeps well-formed entries and drops the rest", () => {
    expect(
      parseStatusOptions([
        { id: "a", name: "new" },
        { id: "b" },
        { name: "plan" },
        null,
        "apply",
        { id: "c", name: "test" },
      ])
    ).toEqual([
      { id: "a", name: "new" },
      { id: "c", name: "test" },
    ]);
  });

  it("returns an empty list for a non-array", () => {
    expect(parseStatusOptions({ id: "a", name: "new" })).toEqual([]);
  });
});

describe("columnForItem", () => {
  it("follows the board status for an open item", () => {
    expect(columnForItem(item({ status: "apply" }))).toBe("DOING");
    expect(columnForItem(item({ status: "plan" }))).toBe("TODO");
  });

  it("honours a project override", () => {
    expect(columnForItem(item({ status: "test" }), { test: "DOING" })).toBe("DOING");
  });

  it("puts a closed issue in DONE even when its status says otherwise", () => {
    expect(columnForItem(item({ state: "closed", status: "plan" }))).toBe("DONE");
  });

  it("puts a merged pull request in DONE", () => {
    expect(
      columnForItem(item({ type: "pull_request", state: "merged", merged: true, status: "test" }))
    ).toBe("DONE");
  });

  it("puts an item with no status in BACKLOG", () => {
    expect(columnForItem(item())).toBe("BACKLOG");
  });
});
