"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

export async function postDream(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const dreamText = (formData.get("dreamText") as string | null)?.trim() ?? "";

  if (dreamText.length < 1 || dreamText.length > 200) return;

  await prisma.dreamWallPost.create({
    data: {
      userId: session.user.id,
      dreamText,
    },
  });

  revalidatePath("/dream-wall");
}
