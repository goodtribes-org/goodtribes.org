"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/authz";
import { isCommercialLegalType } from "@/lib/legalType";
import { indexDocuments } from "@/lib/meili";

// The Foundation's decision on a founder's application to graduate a
// project out of Sandbox. For commercial projects this also assigns the
// project to a CommercialUmbrellaEntity (GoodTribes Ventures AB) in the
// same action — landing under the paraply-AB and becoming GoodTribes-
// approved happen together, not as separate steps (see PRD 4c).
export async function approveSandboxGraduation(requestId: string, umbrellaEntityId?: string) {
  const adminId = await requireAdminSession();

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

  if (!request.project.hiddenAt) {
    void indexDocuments("projects", [{
      id: `project-${request.project.slug}`,
      type: "project",
      title: request.project.title,
      description: request.project.description ?? "",
      url: `/projects/${request.project.slug}`,
      phase: request.project.phase,
      sdgGoals: request.project.sdgGoals,
      locale: "sv",
    }]);
  }

  revalidatePath("/site-admin/sandbox-graduation");
  revalidatePath(`/projects/${request.project.slug}`);
  revalidatePath(`/projects/${request.project.slug}/edit`);
  revalidatePath("/sandbox");
}

export async function rejectSandboxGraduation(requestId: string, note: string) {
  const adminId = await requireAdminSession();

  const request = await prisma.sandboxGraduationRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "pending") throw new Error("Request not ready to reject");

  await prisma.sandboxGraduationRequest.update({
    where: { id: requestId },
    data: { status: "rejected", decisionNote: note || null, executedById: adminId, executedAt: new Date() },
  });

  revalidatePath("/site-admin/sandbox-graduation");
}
