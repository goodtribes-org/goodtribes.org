"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/authz";
import { isContentTargetType, hideTarget, unhideTarget } from "@/lib/contentModeration";

type Outcome = "dismissed" | "actioned";

export async function reviewContentFlag(targetType: string, targetId: string, outcome: Outcome, note?: string) {
  const adminId = await requireAdminSession();

  if (!isContentTargetType(targetType)) throw new Error("Invalid targetType");

  await prisma.contentFlag.updateMany({
    where: { targetType, targetId, status: "PENDING" },
    data: {
      status: outcome === "dismissed" ? "DISMISSED" : "ACTIONED",
      reviewedById: adminId,
      reviewedAt: new Date(),
      decisionNote: note ?? null,
    },
  });

  if (outcome === "actioned") {
    await hideTarget(targetType, targetId, { hiddenById: adminId, hiddenReason: "ADMIN_ACTION" });
  } else {
    await unhideTarget(targetType, targetId);
  }

  revalidatePath("/site-admin/content-flags");
}
