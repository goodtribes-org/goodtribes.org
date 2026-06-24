"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { indexDocuments } from "@/lib/meili";

const prisma = new PrismaClient();

export async function saveProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const name = (formData.get("name") as string).trim();
  const bio = (formData.get("bio") as string | null)?.trim() ?? "";
  const image = (formData.get("image") as string | null)?.trim() || null;

  const socialLinks: Record<string, string> = {};
  for (const key of ["website", "linkedin", "github", "twitter"] as const) {
    const val = (formData.get(key) as string | null)?.trim();
    if (val) socialLinks[key] = val;
  }

  const showProfile = formData.get("showProfile") === "on";
  const skillIds = formData.getAll("skillIds") as string[];

  const updated = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      name,
      bio: bio || null,
      socialLinks,
      onboarded: true,
      showProfile,
      ...(image ? { image } : {}),
    },
  });

  await prisma.$transaction([
    prisma.userSkill.deleteMany({ where: { userId: updated.id } }),
    prisma.userSkill.createMany({
      data: skillIds.map((skillId) => ({ userId: updated.id, skillId })),
      skipDuplicates: true,
    }),
  ]);

  if (showProfile) {
    await indexDocuments("members", [
      {
        id: `member-${updated.id}`,
        type: "member",
        title: name,
        description: bio || "",
        url: `/members/${updated.id}`,
      },
    ]);
  }

  redirect("/profile");
}
