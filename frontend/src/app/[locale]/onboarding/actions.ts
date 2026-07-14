"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";


export async function saveOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Interests and skills are already collected by /profile/setup, which is
  // always completed right before this — only the goal choice lives here.
  const goal = (formData.get("goal") as string) ?? "explore";

  await prisma.user.update({
    where: { id: userId },
    data: { onboardingDone: true },
  });

  // Redirect based on goal
  if (goal === "start") {
    redirect("/projects/new");
  } else if (goal === "join") {
    redirect("/match");
  } else {
    redirect("/workplace");
  }
}
