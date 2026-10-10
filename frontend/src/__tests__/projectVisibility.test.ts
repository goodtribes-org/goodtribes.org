import fs from "fs";
import path from "path";

jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/authz", () => ({ getProjectRole: jest.fn(), isSiteAdmin: jest.fn() }));
jest.mock("../lib/aiParticipant", () => ({ getAiParticipantUser: jest.fn() }));

import { PUBLIC_PROJECT_WHERE, isDraft, publishMissing } from "../lib/projectVisibility";

describe("drafts (#226)", () => {
  it("a project without publishedAt is a draft", () => {
    expect(isDraft({ publishedAt: null })).toBe(true);
    expect(isDraft({ publishedAt: new Date() })).toBe(false);
  });

  it("public means not hidden and published", () => {
    expect(PUBLIC_PROJECT_WHERE).toEqual({ hiddenAt: null, publishedAt: { not: null } });
  });

  it("publishing needs a title and a short text, summary or description", () => {
    expect(publishMissing({ title: "Träd", summary: null, description: null })).toEqual(["about"]);
    expect(publishMissing({ title: " ", summary: "Om", description: null })).toEqual(["title"]);
    expect(publishMissing({ title: "Träd", summary: null, description: "<p>Ett träd per barn</p>" })).toEqual([]);
  });
});

// Static guard: every surface that shows projects to people outside the
// project must filter through PUBLIC_PROJECT_WHERE, or a draft leaks. Add a
// file here when it starts listing projects publicly.
const PUBLIC_SURFACES = [
  "src/lib/listCache.ts",
  "src/lib/activityFeed.ts",
  "src/lib/partnershipMatching.ts",
  "src/lib/impactReports.ts",
  "src/lib/thanks.ts",
  "src/app/sitemap.ts",
  "src/app/api/meili-sync/route.ts",
  "src/app/[locale]/page.tsx",
  "src/app/[locale]/ideas/[id]/page.tsx",
  "src/app/[locale]/members/[id]/page.tsx",
  "src/app/[locale]/org/[slug]/page.tsx",
  "src/app/[locale]/skill/[slug]/page.tsx",
  // The first-task list and the start page section query through lib/firstTasks.ts (#279).
  "src/lib/firstTasks.ts",
  "src/app/[locale]/hall-of-impact/page.tsx",
  "src/app/[locale]/my-goodtribes/FindTab.tsx",
  "src/app/[locale]/impact-fond/mina-fordelningar/page.tsx",
  "src/app/[locale]/fork/actions.ts",
  "src/app/api/projects/instances/route.ts",
];

describe("public surfaces filter out drafts", () => {
  it.each(PUBLIC_SURFACES)("%s uses PUBLIC_PROJECT_WHERE", (file) => {
    const source = fs.readFileSync(path.join(__dirname, "..", "..", file), "utf8");
    expect(source).toContain("PUBLIC_PROJECT_WHERE");
  });

  const projectDir = path.join(__dirname, "..", "app", "[locale]", "projects", "[slug]");

  it("every project page goes through the draft gate in the shared layout", () => {
    expect(fs.readFileSync(path.join(projectDir, "layout.tsx"), "utf8")).toContain("notFoundUnlessVisible(slug)");
  });

  // A page's generateMetadata runs even when the layout 404s, so it must
  // check too, or a draft's title leaks into the 404 page.
  const pages = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? pages(path.join(dir, e.name)) : e.name === "page.tsx" ? [path.join(dir, e.name)] : [],
    );
  const withSlugMetadata = pages(projectDir).filter((f) => /generateMetadata[\s\S]*?const \{[^}]*\bslug\b[^}]*\} = await params/.test(fs.readFileSync(f, "utf8")));

  it("finds the project pages with metadata", () => {
    expect(withSlugMetadata.length).toBeGreaterThan(20);
  });

  it.each(withSlugMetadata.map((f) => [path.relative(projectDir, f)]))("%s checks the draft gate in generateMetadata", (rel) => {
    expect(fs.readFileSync(path.join(projectDir, rel), "utf8")).toContain("await notFoundUnlessVisible(slug)");
  });
});
