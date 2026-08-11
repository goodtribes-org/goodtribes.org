"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/authz";

type Outcome = "reviewed" | "dismissed";

export async function reviewSuggestion(id: string, outcome: Outcome, note?: string) {
  const adminId = await requireAdminSession();

  await prisma.suggestion.update({
    where: { id },
    data: {
      status: outcome,
      reviewedById: adminId,
      reviewedAt: new Date(),
      decisionNote: note?.trim() || null,
    },
  });

  revalidatePath("/site-admin/suggestions");
  revalidatePath("/suggestions");
}
