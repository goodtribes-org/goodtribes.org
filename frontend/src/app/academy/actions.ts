"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function completeGuide(guideId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.userGuideCompletion.upsert({
    where: { userId_guideId: { userId: session.user.id, guideId } },
    create: { userId: session.user.id, guideId },
    update: {},
  });

  revalidatePath(`/academy/${guideId}`);
}

export async function createGuide(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const title = (formData.get("title") as string).trim();
  if (!title) return;

  const bodyMarkdown = (formData.get("bodyMarkdown") as string).trim();
  const category = (formData.get("category") as string).trim();
  const difficulty = (formData.get("difficulty") as string).trim() || "beginner";
  const readTimeMinutesRaw = formData.get("readTimeMinutes") as string | null;
  const readTimeMinutes = readTimeMinutesRaw ? parseInt(readTimeMinutesRaw) || 5 : 5;

  await prisma.academyGuide.create({
    data: {
      title,
      bodyMarkdown,
      category,
      difficulty,
      readTimeMinutes,
      authorId: session.user.id,
      published: false,
    },
  });

  redirect("/academy");
}
