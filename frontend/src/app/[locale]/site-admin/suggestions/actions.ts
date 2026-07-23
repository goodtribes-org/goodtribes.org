"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  return requireSiteAdmin(session.user.id);
}

type Outcome = "reviewed" | "dismissed";

export async function reviewSuggestion(id: string, outcome: Outcome, note?: string) {
  const admin = await requireAdmin();

  await prisma.suggestion.update({
    where: { id },
    data: {
      status: outcome,
      reviewedById: admin.id,
      reviewedAt: new Date(),
      decisionNote: note?.trim() || null,
    },
  });

  revalidatePath("/site-admin/suggestions");
  revalidatePath("/suggestions");
}
