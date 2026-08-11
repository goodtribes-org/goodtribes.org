"use server";

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/authz";
import { reviewEntityContentFlag, type EntityFlagOutcome } from "@/lib/entityFlagReview";


type Outcome = "dismissed" | "warned" | "removed";

export async function reviewOrgFlag(flagId: string, outcome: Outcome, note?: string) {
  const adminId = await requireAdminSession();

  const flag = await prisma.organisationFlag.findUnique({
    where: { id: flagId },
    select: { id: true, organisationId: true },
  });

  if (!flag) throw new Error("Flag not found");

  await prisma.organisationFlag.update({
    where: { id: flagId },
    data: {
      status: outcome === "dismissed" ? "dismissed" : "resolved",
      reviewedById: adminId,
      decisionNote: note ?? null,
    },
  });

  await prisma.organisationEthicsReview.create({
    data: {
      organisationId: flag.organisationId,
      reviewerId: adminId,
      organisationFlagId: flagId,
      outcome,
      note: note ?? null,
    },
  });

  // "removed" unpublishes rather than hard-deletes — deleting an organisation
  // outright would orphan any Project.orgId still pointing at it.
  if (outcome === "removed") {
    await prisma.organisation.update({
      where: { id: flag.organisationId },
      data: { isPublic: false, verified: false },
    });
  }

  revalidatePath("/site-admin/organisations");
}

// Reviews an Organisation ContentFlag (the unified flagging pipeline) — the
// counterpart to reviewOrgFlag above for legacy OrganisationFlag rows.
export async function reviewOrgContentFlag(contentFlagId: string, outcome: EntityFlagOutcome, note?: string) {
  const adminId = await requireAdminSession();

  const flag = await prisma.contentFlag.findUnique({
    where: { id: contentFlagId },
    select: { id: true, targetId: true, targetType: true },
  });
  if (!flag || flag.targetType !== "Organisation") throw new Error("Flag not found");

  await reviewEntityContentFlag(flag.id, "Organisation", flag.targetId, adminId, outcome, note);

  revalidatePath("/site-admin/organisations");
}

export async function setOrganisationVerified(organisationId: string, verified: boolean) {
  await requireAdminSession();

  await prisma.organisation.update({
    where: { id: organisationId },
    data: { verified },
  });

  revalidatePath("/site-admin/organisations");
}
