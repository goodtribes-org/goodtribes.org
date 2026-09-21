"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/authz";
import { enqueueFundingSourceAddedMatch } from "@/lib/fundingMatching";
import type { FundingSourceCategory, LegalType } from "@prisma/client";

type FundingSourceInput = {
  name: string;
  organization: string;
  description: string;
  category: FundingSourceCategory;
  sdgGoals: number[];
  eligibleLegalTypes: LegalType[];
  tags: string[];
  minAmountSek: number | null;
  maxAmountSek: number | null;
  applicationUrl: string;
  requiresBankId: boolean;
  region: string;
  rollingDeadline: boolean;
  nextDeadline: string | null;
};

export async function createFundingSource(input: FundingSourceInput) {
  const userId = await requireAdminSession();

  const name = input.name.trim();
  if (!name) throw new Error("Namn krävs");

  const source = await prisma.fundingSource.create({
    data: {
      name,
      organization: input.organization.trim() || null,
      description: input.description.trim() || null,
      category: input.category,
      sdgGoals: input.sdgGoals,
      eligibleLegalTypes: input.eligibleLegalTypes,
      tags: input.tags,
      minAmountSek: input.minAmountSek,
      maxAmountSek: input.maxAmountSek,
      applicationUrl: input.applicationUrl.trim() || null,
      requiresBankId: input.requiresBankId,
      region: input.region.trim() || null,
      rollingDeadline: input.rollingDeadline,
      nextDeadline: input.nextDeadline ? new Date(input.nextDeadline) : null,
      createdById: userId,
    },
  });

  void enqueueFundingSourceAddedMatch(source.id);

  revalidatePath("/site-admin/funding-sources");
  return source;
}

export async function archiveFundingSource(id: string) {
  await requireAdminSession();
  await prisma.fundingSource.update({ where: { id }, data: { status: "ARCHIVED" } });
  revalidatePath("/site-admin/funding-sources");
}

export async function reactivateFundingSource(id: string) {
  await requireAdminSession();
  await prisma.fundingSource.update({ where: { id }, data: { status: "ACTIVE" } });
  revalidatePath("/site-admin/funding-sources");
}
