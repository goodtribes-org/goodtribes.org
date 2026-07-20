"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
