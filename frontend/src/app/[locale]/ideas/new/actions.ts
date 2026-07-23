"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { indexDocuments } from "@/lib/meili";
import { suggestSdgGoals } from "@/lib/claude";

export async function getSdgSuggestions(
  description: string
): Promise<{ goals: number[]; reasoning: string } | null> {
  return suggestSdgGoals(description);
}


export async function createIdea(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const title = (formData.get("title") as string).trim();
  if (!title) return;

  const problem = (formData.get("problem") as string | null)?.trim() || null;
  const solution = (formData.get("solution") as string | null)?.trim() || null;
  const category = (formData.get("category") as string | null)?.trim() || null;
  const tagsRaw = (formData.get("tags") as string | null)?.trim() || "";
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const imageUrl = (formData.get("imageUrl") as string | null)?.trim() || null;
  const targetRegion = (formData.get("targetRegion") as string | null)?.trim() || "global";
  const estimatedReachRaw = formData.get("estimatedReach") as string | null;
  const estimatedReach = estimatedReachRaw ? parseInt(estimatedReachRaw) || null : null;
  const status = (formData.get("status") as string | null) === "draft" ? "draft" : "open";
  const sdgGoals = formData.getAll("sdgGoals").map(Number).filter((n) => n >= 1 && n <= 17);
  const fromThreadId = (formData.get("fromThread") as string | null)?.trim() || null;

  const idea = await prisma.idea.create({
    data: {
      title, problem, solution, category, tags, imageUrl,
      targetRegion, estimatedReach, status, sdgGoals,
      authorId: session.user.id,
    },
  });

  await prisma.ideaContributor
    .create({ data: { ideaId: idea.id, userId: session.user.id, role: "author" } })
    .catch(() => {});

  if (fromThreadId) {
    await prisma.room
      .update({ where: { id: fromThreadId }, data: { convertedToIdeaId: idea.id } })
      .catch(() => null);
  }

  if (status === "open") {
    await indexDocuments("ideas", [{
      id: `idea-${idea.id}`,
      type: "idea",
      title: idea.title,
      description: idea.problem ?? "",
      url: `/ideas/${idea.id}`,
    }]).catch(() => {});
  }

  redirect(`/ideas/${idea.id}`);
}
