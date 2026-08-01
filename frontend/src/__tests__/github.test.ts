import { parseRepoInput } from "@/lib/github";
import { columnForItem } from "@/lib/githubSync";
import type { GithubIssue } from "@/lib/github";

function issue(overrides: Partial<GithubIssue> = {}): GithubIssue {
  return {
    number: 1,
    title: "t",
    body: null,
    state: "open",
    html_url: "https://github.com/o/r/issues/1",
    labels: [],
    user: null,
    assignees: [],
    milestone: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    closed_at: null,
    ...overrides,
  };
}

describe("parseRepoInput", () => {
  it("accepts owner/repo", () => {
    expect(parseRepoInput("goodtribes-org/deploy")).toEqual({
      owner: "goodtribes-org",
      repo: "deploy",
    });
  });

  it("accepts an https URL and strips .git", () => {
    expect(parseRepoInput("https://github.com/goodtribes-org/deploy.git")).toEqual({
      owner: "goodtribes-org",
      repo: "deploy",
    });
  });

  it("accepts an ssh remote", () => {
    expect(parseRepoInput("git@github.com:goodtribes-org/deploy.git")).toEqual({
      owner: "goodtribes-org",
      repo: "deploy",
    });
  });

  it("resolves a pasted issue URL back to its repo", () => {
    expect(parseRepoInput("https://github.com/goodtribes-org/deploy/issues/5")).toEqual({
      owner: "goodtribes-org",
      repo: "deploy",
    });
  });

  it("rejects blank, partial and malformed input", () => {
    for (const bad of ["", "   ", null, undefined, "deploy", "a/b/c", "own er/repo"]) {
      expect(parseRepoInput(bad)).toBeNull();
    }
  });
});

describe("columnForItem", () => {
  it("puts an unassigned open issue in BACKLOG", () => {
    expect(columnForItem(issue())).toBe("BACKLOG");
  });

  it("puts an assigned open issue in DOING", () => {
    expect(columnForItem(issue({ assignees: [{ login: "someone" }] }))).toBe("DOING");
  });

  it("puts an open pull request in REVIEW", () => {
    expect(columnForItem(issue({ pull_request: { merged_at: null } }))).toBe("REVIEW");
  });

  it("puts a closed issue in DONE even when assigned", () => {
    expect(
      columnForItem(issue({ state: "closed", assignees: [{ login: "someone" }] }))
    ).toBe("DONE");
  });

  it("puts a merged pull request in DONE", () => {
    expect(
      columnForItem(
        issue({ state: "open", pull_request: { merged_at: "2026-01-02T00:00:00Z" } })
      )
    ).toBe("DONE");
  });
});
