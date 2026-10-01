const findFirst = jest.fn();
const findUnique = jest.fn();
const upsert = jest.fn();

jest.mock("../lib/prisma", () => ({
  prisma: { skill: { findFirst: (a: unknown) => findFirst(a), findUnique: (a: unknown) => findUnique(a), upsert: (a: unknown) => upsert(a) } },
}));

import { findOrCreateSkill, normalizeSkillNames, MAX_SKILL_NAME_LENGTH } from "../lib/skills";

describe("normalizeSkillNames", () => {
  it("trims, collapses whitespace and drops empty names", () => {
    expect(normalizeSkillNames(["  UX-design ", "", "   ", "App   utvecklare"])).toEqual(["UX-design", "App utvecklare"]);
  });

  it("drops case-insensitive duplicates and keeps the first spelling", () => {
    expect(normalizeSkillNames(["UX-design", "ux-design", "Ux-Design", "Ölbryggning", "ÖLBRYGGNING"])).toEqual(["UX-design", "Ölbryggning"]);
  });

  it("drops names longer than the limit", () => {
    const tooLong = "a".repeat(MAX_SKILL_NAME_LENGTH + 1);
    const justRight = "b".repeat(MAX_SKILL_NAME_LENGTH);
    expect(normalizeSkillNames([tooLong, justRight])).toEqual([justRight]);
  });
});

describe("findOrCreateSkill", () => {
  beforeEach(() => {
    findFirst.mockReset();
    findUnique.mockReset();
    upsert.mockReset();
  });

  it("reuses an existing skill with the same name in another letter case", async () => {
    const existing = { id: "s1", name: "UX-design", slug: "ux-design" };
    findFirst.mockResolvedValue(existing);

    await expect(findOrCreateSkill({ name: "ux-design", tag: "övrigt", description: "" })).resolves.toBe(existing);
    expect(findFirst).toHaveBeenCalledWith({ where: { name: { equals: "ux-design", mode: "insensitive" } } });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("creates a new skill with a unique slug when the base slug is taken", async () => {
    findFirst.mockResolvedValue(null);
    findUnique.mockResolvedValueOnce({ id: "other" }).mockResolvedValueOnce(null); // "apputvecklare" taken, "-2" free
    upsert.mockImplementation(({ create }: { create: unknown }) => Promise.resolve({ id: "new", ...(create as object) }));

    const skill = await findOrCreateSkill({ name: "Apputvecklare", tag: "övrigt", description: "" });
    expect(skill).toMatchObject({ name: "Apputvecklare", slug: "apputvecklare-2", tag: "övrigt" });
  });
});
