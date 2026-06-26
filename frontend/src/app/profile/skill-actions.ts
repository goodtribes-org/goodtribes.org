"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slugify";


export async function addSkill(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const name = (formData.get("name") as string).trim();
  const tag = (formData.get("tag") as string).trim();
  const description = (formData.get("description") as string).trim();

  if (!name || !tag || !description) return;

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let attempt = 1;

  while (true) {
    const existing = await prisma.skill.findUnique({ where: { slug } });
    if (!existing) break;
    if (existing.name.toLowerCase() === name.toLowerCase()) {
      slug = existing.slug;
      break;
    }
    slug = `${baseSlug}-${++attempt}`;
  }

  const skill = await prisma.skill.upsert({
    where: { name },
    create: { name, tag, description, slug },
    update: {},
  });

  await prisma.userSkill.upsert({
    where: { userId_skillId: { userId: session.user.id, skillId: skill.id } },
    create: { userId: session.user.id, skillId: skill.id },
    update: {},
  });

  redirect("/profile");
}

export async function removeSkill(skillId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.userSkill.deleteMany({
    where: { userId: session.user.id, skillId },
  });

  redirect("/profile");
}
