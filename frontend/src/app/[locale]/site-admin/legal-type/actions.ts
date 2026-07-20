"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";
import { isValidLegalType } from "@/lib/legalType";

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);
  return session.user.id;
}

// Stiftelsen's actual execution of a member-approved legal_type change
// (PRD 4c) — real-world legal acts (forming/joining an AB, dissolving an
// association) that a database vote can only request, never perform.
export async function executeLegalTypeChange(requestId: string, umbrellaEntityId?: string) {
  const adminId = await requireAdmin();

  const request = await prisma.legalTypeChangeRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "approved_by_members") throw new Error("Request not ready to execute");

  await prisma.$transaction([
    prisma.project.update({
      where: { id: request.projectId },
      data: {
        legalType: request.requestedType,
        commercialUmbrellaEntityId: request.requestedType === "COMMERCIAL_UMBRELLA" ? umbrellaEntityId ?? null : null,
      },
    }),
    prisma.legalTypeChangeRequest.update({
      where: { id: requestId },
      data: { status: "executed", executedById: adminId, executedAt: new Date() },
    }),
  ]);

  revalidatePath("/site-admin/legal-type");
}

// PRD 4c: "Stiftelsen kan avslå en begäran om övergång om den bedöms
// medföra oskälig juridisk, ekonomisk eller skattemässig risk."
export async function rejectLegalTypeChange(requestId: string, note: string) {
  const adminId = await requireAdmin();

  const request = await prisma.legalTypeChangeRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "approved_by_members") throw new Error("Request not ready to reject");

  await prisma.legalTypeChangeRequest.update({
    where: { id: requestId },
    data: { status: "rejected_by_foundation", decisionNote: note || null, executedById: adminId, executedAt: new Date() },
  });

  revalidatePath("/site-admin/legal-type");
}

export async function createUmbrellaEntity(formData: FormData) {
  await requireAdmin();

  const name = (formData.get("name") as string | null)?.trim();
  const foundationAbOrgNumber = (formData.get("foundationAbOrgNumber") as string | null)?.trim() || null;
  if (!name) return;

  await prisma.commercialUmbrellaEntity.create({ data: { name, foundationAbOrgNumber } });
  revalidatePath("/site-admin/legal-type");
}

// Direct override, no request/vote — for corrections and initial rollout,
// same trust level as other direct site-admin project edits.
export async function setLegalTypeDirectly(formData: FormData) {
  await requireAdmin();

  const slug = (formData.get("slug") as string | null)?.trim();
  const legalType = (formData.get("legalType") as string | null)?.trim() ?? "";
  const umbrellaEntityId = (formData.get("umbrellaEntityId") as string | null)?.trim() || null;
  if (!slug || !isValidLegalType(legalType)) return;

  await prisma.project.update({
    where: { slug },
    data: {
      legalType,
      commercialUmbrellaEntityId: legalType === "COMMERCIAL_UMBRELLA" ? umbrellaEntityId : null,
    },
  });

  revalidatePath("/site-admin/legal-type");
}
