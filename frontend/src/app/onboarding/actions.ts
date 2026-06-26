"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

export async function saveOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Parse interests: comma-separated list of SDG numbers
  const interestsRaw = formData.getAll("interests");
  const interests = interestsRaw
    .map((v) => parseInt(v as string, 10))
    .filter((n) => !isNaN(n));

  // Parse skillIds: array of skill cuid strings
  const skillIds = formData.getAll("skillIds").map((v) => v as string).filter(Boolean);

  // Parse goal radio
  const goal = (formData.get("goal") as string) ?? "explore";

  // Update user interests + mark onboarding done
  await prisma.user.update({
    where: { id: userId },
    data: {
      interests,
      onboardingDone: true,
    },
  });

  // Upsert UserSkill rows
  for (const skillId of skillIds) {
    await prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId } },
      create: { userId, skillId },
      update: {},
    });
  }

  // Redirect based on goal
  if (goal === "start") {
    redirect("/projects/new");
  } else if (goal === "join") {
    redirect("/match");
  } else {
    redirect("/workplace");
  }
}
