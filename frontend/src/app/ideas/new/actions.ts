"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { indexDocuments } from "@/lib/meili";
import { suggestSdgGoals } from "@/lib/claude";

export async function getSdgSuggestions(
  description: string
): Promise<{ goals: number[]; reasoning: string } | null> {
  return suggestSdgGoals(description);
}

const prisma = new PrismaClient();

export async function createIdea(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const title = (formData.get("title") as string).trim();
  if (!title) return;

  const description = (formData.get("description") as string | null)?.trim() || null;
  const sdgGoals = formData
    .getAll("sdgGoals")
    .map(Number)
    .filter((n) => n >= 1 && n <= 17);

  const idea = await prisma.idea.create({
    data: { title, description, sdgGoals, authorId: session.user.id },
  });

  await indexDocuments("ideas", [
    {
      id: `idea-${idea.id}`,
      type: "idea",
      title: idea.title,
      description: idea.description ?? "",
      url: `/ideas/${idea.id}`,
    },
  ]);

  redirect(`/ideas/${idea.id}`);
}
