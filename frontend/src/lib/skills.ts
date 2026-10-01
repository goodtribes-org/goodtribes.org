import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { MAX_SKILL_NAME_LENGTH } from "@/lib/skillLimits";

export { MAX_SKILL_NAME_LENGTH, MAX_NEW_SKILLS_PER_SAVE } from "@/lib/skillLimits";

// Trims, collapses inner whitespace, drops empty/too-long names and
// case-insensitive duplicates. Order is kept.
export function normalizeSkillNames(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const name = r.replace(/\s+/g, " ").trim();
    if (!name || name.length > MAX_SKILL_NAME_LENGTH) continue;
    const key = name.toLocaleLowerCase("sv");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

// The one place a skill gets created, shared by the profile ("Lägg till
// kompetens") and a project's "Kompetenser som behövs". An existing skill
// with the same name in any letter case is reused, so "UX-design" and
// "ux-design" never become two skills; otherwise a new one is created with a
// unique slug.
export async function findOrCreateSkill({ name, tag, description }: { name: string; tag: string; description: string }) {
  const existing = await prisma.skill.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing) return existing;

  const baseSlug = slugify(name) || "kompetens";
  let slug = baseSlug;
  for (let attempt = 2; await prisma.skill.findUnique({ where: { slug } }); attempt++) {
    slug = `${baseSlug}-${attempt}`;
  }

  // upsert on the unique name, so two saves racing on the same new name end
  // up on one row instead of the second one failing.
  return prisma.skill.upsert({
    where: { name },
    create: { name, tag, description, slug },
    update: {},
  });
}
