"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { indexDocuments } from "@/lib/meili";
import { suggestSdgGoals } from "@/lib/claude";
import { mintDirectGt, SANDBOX_GT_POOL } from "@/lib/tokens";
import { getSandboxRoomContributorWeights } from "@/lib/rooms";

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

  if (fromThreadId) {
    const room = await prisma.room
      .update({ where: { id: fromThreadId }, data: { convertedToIdeaId: idea.id } })
      .catch(() => null);

    // Sandlådan (Utvecklingsfas 1.2): no project exists yet at this point, so
    // only the GT recognition happens here — fresh Tribe Tokens follow later
    // if/when this Idea itself becomes a Project (see createProject's
    // ideaId branch).
    if (room?.isSandbox) {
      const contributors = await getSandboxRoomContributorWeights(fromThreadId);
      const totalWeight = contributors.reduce((sum, c) => sum + c.weight, 0);
      if (totalWeight > 0) {
        await prisma.$transaction(async (tx) => {
          for (const c of contributors) {
            await mintDirectGt(tx, {
              userId: c.userId,
              tokens: SANDBOX_GT_POOL * (c.weight / totalWeight),
              reason: "Sandlåda: bidrag lyft till Idéflödet",
            });
          }
        });
      }
    }
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
