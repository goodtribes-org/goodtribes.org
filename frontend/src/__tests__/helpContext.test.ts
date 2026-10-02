import sv from "../../messages/sv.json";
import en from "../../messages/en.json";
import { GUIDES, helpContextFor, orderedGuides, PROJECT_PAGE_HELP } from "../lib/helpContext";

describe("helpContextFor", () => {
  it("finds the page's own help text inside a project", () => {
    expect(helpContextFor("/projects/x/tasks")).toEqual({ projectSlug: "x", pageHelp: "TasksPage" });
    expect(helpContextFor("/projects/x/lean-canvas")).toEqual({ projectSlug: "x", pageHelp: "LeanCanvasPage" });
    expect(helpContextFor("/projects/x/wiki/start")).toEqual({ projectSlug: "x", pageHelp: "WikiPageDetail" });
    expect(helpContextFor("/projects/x/funding/recurring").pageHelp).toBe("RecurringFundingPage");
  });

  it("a project page without its own text still knows the project", () => {
    expect(helpContextFor("/projects/x")).toEqual({ projectSlug: "x", pageHelp: null });
    expect(helpContextFor("/projects/x/uppstart")).toEqual({ projectSlug: "x", pageHelp: null });
  });

  it("outside a project, and on /projects/new, there's no project", () => {
    expect(helpContextFor("/")).toEqual({ projectSlug: null, pageHelp: null });
    expect(helpContextFor("/projects")).toEqual({ projectSlug: null, pageHelp: null });
    expect(helpContextFor("/projects/new/samtal")).toEqual({ projectSlug: null, pageHelp: null });
  });

  it("every mapped page has a help text in both languages", () => {
    for (const ns of new Set(Object.values(PROJECT_PAGE_HELP).concat("RecurringFundingPage"))) {
      expect((sv as Record<string, { helpText?: string }>)[ns]?.helpText).toBeTruthy();
      expect((en as Record<string, { helpText?: string }>)[ns]?.helpText).toBeTruthy();
    }
  });
});

describe("orderedGuides", () => {
  const keys = (path: string, inProject = false) => orderedGuides(path, inProject).map((g) => g.key);

  it("puts the guide about the page first", () => {
    expect(keys("/projects")[0]).toBe("findProject");
    expect(keys("/projects/new")[0]).toBe("startProject");
    expect(keys("/my-goodtribes")[0]).toBe("myGoodTribes");
    expect(keys("/academy/abc")[0]).toBe("academy");
  });

  it("keeps the default order elsewhere and inside projects", () => {
    const order = GUIDES.map((g) => g.key);
    expect(keys("/")).toEqual(order);
    expect(keys("/projects/x/tasks", true)).toEqual(order);
  });

  it("never drops or duplicates a guide", () => {
    expect(keys("/projects").sort()).toEqual(GUIDES.map((g) => g.key).sort());
  });
});
