"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { findOrCreateSkill } from "@/lib/skills";
import { MEMBERS_LIST_TAG, invalidateListCache } from "@/lib/listCache";


export async function addSkill(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const name = (formData.get("name") as string).trim();
  const tag = (formData.get("tag") as string).trim();
  const description = (formData.get("description") as string).trim();

  if (!name || !tag || !description) return;

  const skill = await findOrCreateSkill({ name, tag, description });

  await prisma.userSkill.upsert({
    where: { userId_skillId: { userId: session.user.id, skillId: skill.id } },
    create: { userId: session.user.id, skillId: skill.id },
    update: {},
  });
  invalidateListCache(MEMBERS_LIST_TAG);

  redirect("/profile");
}

export async function removeSkill(skillId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.userSkill.deleteMany({
    where: { userId: session.user.id, skillId },
  });
  invalidateListCache(MEMBERS_LIST_TAG);

  redirect("/profile");
}
