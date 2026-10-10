import fs from "fs";
import path from "path";

jest.mock("../lib/authz", () => ({ isRealMember: jest.fn(), isSiteAdmin: jest.fn() }));

import { isRealMember, isSiteAdmin } from "../lib/authz";
import { canSeeInterviewNotes } from "../lib/interviewAccess";

const member = isRealMember as jest.Mock;
const admin = isSiteAdmin as jest.Mock;

describe("interview notes are for the team (#276)", () => {
  beforeEach(() => { member.mockReset(); admin.mockReset(); });

  it("a visitor who isn't logged in sees none", async () => {
    expect(await canSeeInterviewNotes("p", null)).toBe(false);
    expect(member).not.toHaveBeenCalled();
  });

  it("a logged-in non-member sees none", async () => {
    member.mockResolvedValue(false);
    admin.mockResolvedValue(false);
    expect(await canSeeInterviewNotes("p", "u")).toBe(false);
  });

  it("members and site admins see them", async () => {
    member.mockResolvedValue(true);
    expect(await canSeeInterviewNotes("p", "u")).toBe(true);
    member.mockResolvedValue(false);
    admin.mockResolvedValue(true);
    expect(await canSeeInterviewNotes("p", "u")).toBe(true);
  });
});

// Static guard: every page that shows interview notes (or who was
// interviewed) checks canSeeInterviewNotes. Add a page here when it starts
// showing them; AI context builders (ideaInsights, phaseGate) only count or
// read them for members.
const SURFACES = [
  "src/app/[locale]/projects/[slug]/(workspace)/interviews/page.tsx",
  "src/app/[locale]/projects/[slug]/(workspace)/ide/page.tsx",
];

describe("pages that show interview notes check access", () => {
  it.each(SURFACES)("%s uses canSeeInterviewNotes", (file) => {
    const source = fs.readFileSync(path.join(__dirname, "..", "..", file), "utf8");
    expect(source).toContain("canSeeInterviewNotes");
  });

  it("no other page reads interview notes", () => {
    const appDir = path.join(__dirname, "..", "app");
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    const readers = walk(appDir)
      .filter((f) => /page\.tsx$/.test(f) && fs.readFileSync(f, "utf8").includes("interviewLogEntry"))
      .map((f) => path.relative(path.join(__dirname, "..", ".."), f));
    expect(readers.sort()).toEqual([...SURFACES].sort());
  });
});
