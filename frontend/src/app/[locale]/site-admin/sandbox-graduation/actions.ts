"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";
import { isCommercialLegalType } from "@/lib/legalType";
import { indexDocuments } from "@/lib/meili";

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);
  return session.user.id;
}

// The Foundation's decision on a founder's application to graduate a
// project out of Sandbox. For commercial projects this also assigns the
// project to a CommercialUmbrellaEntity (GoodTribes Ventures AB) in the
// same action — landing under the paraply-AB and becoming GoodTribes-
// approved happen together, not as separate steps (see PRD 4c).
export async function approveSandboxGraduation(requestId: string, umbrellaEntityId?: string) {
  const adminId = await requireAdmin();

  const request = await prisma.sandboxGraduationRequest.findUnique({
    where: { id: requestId },
    include: { project: true },
  });
  if (!request || request.status !== "pending") throw new Error("Request not ready to approve");

  const isCommercial = isCommercialLegalType(request.project.legalType);
  if (isCommercial && !umbrellaEntityId) throw new Error("Ett paraply-AB måste väljas");

  await prisma.$transaction([
    prisma.project.update({
      where: { id: request.projectId },
      data: {
        isSandbox: false,
        ...(isCommercial ? { commercialUmbrellaEntityId: umbrellaEntityId } : {}),
      },
    }),
    prisma.sandboxGraduationRequest.update({
      where: { id: requestId },
      data: { status: "approved", executedById: adminId, executedAt: new Date() },
    }),
  ]);

  if (request.project.visibility === "public") {
    await indexDocuments("projects", [{
      id: `project-${request.project.slug}`,
      type: "project",
      title: request.project.title,
      description: request.project.description ?? "",
      url: `/projects/${request.project.slug}`,
      phase: request.project.phase,
      sdgGoals: request.project.sdgGoals,
    }]);
  }

  revalidatePath("/site-admin/sandbox-graduation");
  revalidatePath(`/projects/${request.project.slug}`);
  revalidatePath(`/projects/${request.project.slug}/edit`);
  revalidatePath("/sandbox");
}

export async function rejectSandboxGraduation(requestId: string, note: string) {
  const adminId = await requireAdmin();

  const request = await prisma.sandboxGraduationRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "pending") throw new Error("Request not ready to reject");

  await prisma.sandboxGraduationRequest.update({
    where: { id: requestId },
    data: { status: "rejected", decisionNote: note || null, executedById: adminId, executedAt: new Date() },
  });

  revalidatePath("/site-admin/sandbox-graduation");
}
