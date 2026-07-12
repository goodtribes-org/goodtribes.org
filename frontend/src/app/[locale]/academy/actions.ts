"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isSiteAdmin } from "@/lib/authz";


export async function publishGuide(guideId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const guide = await prisma.academyGuide.findUnique({
    where: { id: guideId },
    select: { authorId: true },
  });
  if (!guide) return;

  const isAuthor = guide.authorId === session.user.id;
  if (!isAuthor && !(await isSiteAdmin(session.user.id))) return;

  await prisma.academyGuide.update({
    where: { id: guideId },
    data: { published: true },
  });

  revalidatePath("/academy");
  revalidatePath(`/academy/${guideId}`);
}

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
