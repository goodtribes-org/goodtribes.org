"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { requireEthicsReviewer } from "@/lib/authz";
import { reviewEntityContentFlag, type EntityFlagOutcome } from "@/lib/entityFlagReview";


// Ethics review of flagged projects is authorized for site-admin staff or a
// currently-serving Granskningsrådet member (PRD 5.53/5.54).
async function requireReviewer(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireEthicsReviewer(session.user.id);
  return session.user.id;
}

type Outcome = "dismissed" | "warned" | "removed";

export async function reviewFlag(flagId: string, outcome: Outcome, note?: string) {
  const reviewerId = await requireReviewer();

  const flag = await prisma.projectFlag.findUnique({
    where: { id: flagId },
    select: { id: true, projectId: true },
  });

  if (!flag) throw new Error("Flag not found");

  // Update the flag status
  await prisma.projectFlag.update({
    where: { id: flagId },
    data: {
      status: outcome === "dismissed" ? "dismissed" : "resolved",
      reviewedById: reviewerId,
      decisionNote: note ?? null,
    },
  });

  // Create an ethics review record
  await prisma.ethicsReview.create({
    data: {
      projectId: flag.projectId,
      reviewerId,
      projectFlagId: flagId,
      outcome,
      note: note ?? null,
    },
  });

  // If outcome is "removed", delete the project
  if (outcome === "removed") {
    await prisma.project.delete({ where: { id: flag.projectId } });
  }

  revalidatePath("/site-admin/ethics");
}

// Reviews a Project ContentFlag (the unified flagging pipeline) — the
// counterpart to reviewFlag above for legacy ProjectFlag rows.
export async function reviewProjectContentFlag(contentFlagId: string, outcome: EntityFlagOutcome, note?: string) {
  const reviewerId = await requireReviewer();

  const flag = await prisma.contentFlag.findUnique({
    where: { id: contentFlagId },
    select: { id: true, targetId: true, targetType: true },
  });
  if (!flag || flag.targetType !== "Project") throw new Error("Flag not found");

  await reviewEntityContentFlag(flag.id, "Project", flag.targetId, reviewerId, outcome, note);

  revalidatePath("/site-admin/ethics");
}
