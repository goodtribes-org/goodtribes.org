"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";
import { isContentTargetType, hideTarget, unhideTarget } from "@/lib/contentModeration";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  return requireSiteAdmin(session.user.id);
}

type Outcome = "dismissed" | "actioned";

export async function reviewContentFlag(targetType: string, targetId: string, outcome: Outcome, note?: string) {
  const admin = await requireAdmin();

  if (!isContentTargetType(targetType)) throw new Error("Invalid targetType");

  await prisma.contentFlag.updateMany({
    where: { targetType, targetId, status: "PENDING" },
    data: {
      status: outcome === "dismissed" ? "DISMISSED" : "ACTIONED",
      reviewedById: admin.id,
      reviewedAt: new Date(),
      decisionNote: note ?? null,
    },
  });

  if (outcome === "actioned") {
    await hideTarget(targetType, targetId, { hiddenById: admin.id, hiddenReason: "ADMIN_ACTION" });
  } else {
    await unhideTarget(targetType, targetId);
  }

  revalidatePath("/site-admin/content-flags");
}
