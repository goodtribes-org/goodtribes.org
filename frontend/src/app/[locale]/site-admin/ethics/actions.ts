"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";


async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  return requireSiteAdmin(session.user.id);
}

type Outcome = "dismissed" | "warned" | "removed";

export async function reviewFlag(flagId: string, outcome: Outcome, note?: string) {
  const admin = await requireAdmin();

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
      reviewedById: admin.id,
      decisionNote: note ?? null,
    },
  });

  // Create an ethics review record
  await prisma.ethicsReview.create({
    data: {
      projectId: flag.projectId,
      reviewerId: admin.id,
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
