"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ?? "niklas.gunnas@goodtribes.org";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    throw new Error("Forbidden");
  }
  return session.user;
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

  revalidatePath("/admin/ethics");
}
