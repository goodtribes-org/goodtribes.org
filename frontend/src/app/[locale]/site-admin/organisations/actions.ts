"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";


async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  return requireSiteAdmin(session.user.id);
}

type Outcome = "dismissed" | "warned" | "removed";

export async function reviewOrgFlag(flagId: string, outcome: Outcome, note?: string) {
  const admin = await requireAdmin();

  const flag = await prisma.organisationFlag.findUnique({
    where: { id: flagId },
    select: { id: true, organisationId: true },
  });

  if (!flag) throw new Error("Flag not found");

  await prisma.organisationFlag.update({
    where: { id: flagId },
    data: {
      status: outcome === "dismissed" ? "dismissed" : "resolved",
      reviewedById: admin.id,
      decisionNote: note ?? null,
    },
  });

  await prisma.organisationEthicsReview.create({
    data: {
      organisationId: flag.organisationId,
      reviewerId: admin.id,
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

export async function setOrganisationVerified(organisationId: string, verified: boolean) {
  await requireAdmin();

  await prisma.organisation.update({
    where: { id: organisationId },
    data: { verified },
  });

  revalidatePath("/site-admin/organisations");
}
