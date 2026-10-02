"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { indexDocuments } from "@/lib/meili";
import { MEMBERS_LIST_TAG, invalidateListCache } from "@/lib/listCache";


export async function saveProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const name = (formData.get("name") as string).trim();
  const bio = (formData.get("bio") as string | null)?.trim() ?? "";
  const country = (formData.get("country") as string | null)?.trim() || null;
  const image = (formData.get("image") as string | null)?.trim() || null;

  const socialLinks: Record<string, string> = {};
  for (const key of ["website", "linkedin", "github", "twitter"] as const) {
    const val = (formData.get(key) as string | null)?.trim();
    if (val) socialLinks[key] = val;
  }

  const showProfile = formData.get("showProfile") === "on";
  const skillIds = formData.getAll("skillIds") as string[];

  const interestsRaw = formData.get("interests") as string | null;
  const interests: number[] = interestsRaw ? (JSON.parse(interestsRaw) as number[]) : [];

  const availabilityRaw = (formData.get("availability") as string | null)?.trim() || null;
  const availability = availabilityRaw && ["available", "limited", "busy"].includes(availabilityRaw)
    ? availabilityRaw
    : null;

  const existing = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { onboardingDone: true },
  });
  const isFirstSetup = !existing?.onboardingDone;

  const updated = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      name,
      bio: bio || null,
      country,
      socialLinks,
      showProfile,
      interests,
      availability,
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
  invalidateListCache(MEMBERS_LIST_TAG);

  if (showProfile) {
    void indexDocuments("members", [
      {
        id: `member-${updated.id}`,
        type: "member",
        title: name,
        description: bio || "",
        url: `/members/${updated.id}`,
      },
    ]);
  }

  // No welcome mail here: the createUser event in auth.ts already sends
  // one, in the person's language, on their first sign-in.

  redirect(isFirstSetup ? "/onboarding" : "/profile");
}
