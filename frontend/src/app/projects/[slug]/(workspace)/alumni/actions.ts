"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";


export async function archiveProject(projectSlug: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Ej inloggad" };

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true },
  });
  if (!project) return { error: "Projekt hittades inte" };

  const membership = await prisma.projectMember.findFirst({
    where: { projectId: project.id, userId: session.user.id, role: { in: ["owner", "admin"] } },
  });
  if (!membership) return { error: "Endast ägare kan arkivera projekt" };

  const members = await prisma.projectMember.findMany({
    where: { projectId: project.id },
    select: { userId: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const m of members) {
      const tokenSum = await tx.tokenLedger.aggregate({
        where: { projectSlug, userId: m.userId },
        _sum: { tokens: true },
      });
      await tx.projectAlumni.upsert({
        where: { projectSlug_userId: { projectSlug, userId: m.userId } },
        create: {
          projectSlug,
          userId: m.userId,
          tokensEarned: tokenSum._sum.tokens ?? 0,
        },
        update: {
          tokensEarned: tokenSum._sum.tokens ?? 0,
        },
      });
    }

    await tx.project.update({
      where: { slug: projectSlug },
      data: { status: "archived" },
    });
  });

  revalidatePath(`/projects/${projectSlug}`);
  revalidatePath(`/projects/${projectSlug}/alumni`);
  revalidatePath("/hall-of-impact");
  return {};
}
