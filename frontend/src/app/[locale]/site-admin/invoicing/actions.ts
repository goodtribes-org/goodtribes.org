"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/authz";
import { isCommercialLegalType } from "@/lib/legalType";

// The Foundation's decision on a commercial project's application for
// invoicing (#226, formerly "graduating out of Sandbox"): approving it puts
// the project under a CommercialUmbrellaEntity (GoodTribes Ventures AB),
// which is what canInvoice() checks. The request rows are still
// SandboxGraduationRequest — the model kept its name, no migration needed.
export async function approveInvoicingRequest(requestId: string, umbrellaEntityId?: string) {
  const adminId = await requireAdminSession();

  const request = await prisma.sandboxGraduationRequest.findUnique({
    where: { id: requestId },
    include: { project: true },
  });
  if (!request || request.status !== "pending") throw new Error("Request not ready to approve");

  // Only commercial projects apply now; an older nonprofit request (from
  // the Sandbox days) is just closed as approved, nothing to assign.
  const isCommercial = isCommercialLegalType(request.project.legalType);
  if (isCommercial && !umbrellaEntityId) throw new Error("Ett paraply-AB måste väljas");

  await prisma.$transaction([
    ...(isCommercial
      ? [prisma.project.update({ where: { id: request.projectId }, data: { commercialUmbrellaEntityId: umbrellaEntityId } })]
      : []),
    prisma.sandboxGraduationRequest.update({
      where: { id: requestId },
      data: { status: "approved", executedById: adminId, executedAt: new Date() },
    }),
  ]);

  revalidatePath("/site-admin/invoicing");
  revalidatePath(`/projects/${request.project.slug}`);
  revalidatePath(`/projects/${request.project.slug}/edit`);
}

export async function rejectInvoicingRequest(requestId: string, note: string) {
  const adminId = await requireAdminSession();

  const request = await prisma.sandboxGraduationRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "pending") throw new Error("Request not ready to reject");

  await prisma.sandboxGraduationRequest.update({
    where: { id: requestId },
    data: { status: "rejected", decisionNote: note || null, executedById: adminId, executedAt: new Date() },
  });

  revalidatePath("/site-admin/invoicing");
}
