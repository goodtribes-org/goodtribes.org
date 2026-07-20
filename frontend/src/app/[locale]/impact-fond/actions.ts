"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getGtBalance } from "@/lib/tokens";

// PRD 4a Intäktsström 2, Steg 2: a bidragsgivares personal val av vilket
// projekt deras andel av vinsten ska stödja — inget vote krävs, pengarna är
// redan personens, frågan är bara vilket projekt de riktas till.
export async function allocateProfitShare(allocationId: string, targetProjectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");

  const allocation = await prisma.personalProfitAllocation.findUnique({ where: { id: allocationId } });
  if (!allocation || allocation.userId !== session.user.id) throw new Error("Not found");
  if (allocation.processedAt) throw new Error("Already resolved");
  if (new Date() > allocation.allocationDeadline) throw new Error("Deadline has passed");

  const targetProject = await prisma.project.findUnique({ where: { slug: targetProjectSlug } });
  if (!targetProject) throw new Error("Target project not found");

  await prisma.personalProfitAllocation.update({
    where: { id: allocationId },
    data: { targetProjectSlug, processedAt: new Date() },
  });

  revalidatePath("/impact-fond/mina-fordelningar");
}

// PRD 5.50.4: GT-token holders distribute their weight across the candidate
// projects nominated for the Impact-fond's current allocation round — same
// weight-cap logic as castCouncilVote (granskningsradet/actions.ts), kept as
// a separate small action rather than generalizing that council-specific one.
export async function castImpactFundVote(pollId: string, allocations: { optionId: string; weight: number }[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const userId = session.user.id;

  const poll = await prisma.platformPoll.findUnique({ where: { id: pollId } });
  if (!poll) return { error: "Poll not found" };
  if (poll.status !== "open") return { error: "Poll is closed" };

  const gtBalance = Math.max(await getGtBalance(userId), 1);
  const totalWeight = allocations.reduce((sum, a) => sum + a.weight, 0);
  if (totalWeight > gtBalance) return { error: "Insufficient GT balance" };

  await prisma.platformPollVote.deleteMany({ where: { pollId, userId } });
  if (allocations.length > 0) {
    await prisma.platformPollVote.createMany({
      data: allocations.map((a) => ({ pollId, pollOptionId: a.optionId, userId, gtWeight: a.weight })),
    });
  }

  revalidatePath("/impact-fond");
  return { success: true };
}
