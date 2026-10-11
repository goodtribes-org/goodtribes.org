"use server";

import { revalidatePath } from "next/cache";
import type { FundingApplicantType, GoodTribesEntityKind, GoodTribesEntityStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/authz";
import { APPLICANT_TYPES } from "@/lib/fundingCalls/analyze";

// GoodTribes entities (#346): who can stand as applicant (and invoice).
// Administered here, never hardcoded — the structure is not final.

const KINDS: GoodTribesEntityKind[] = ["LIMITED_COMPANY", "FOUNDATION", "NONPROFIT", "PARTNER"];
const STATUSES: GoodTribesEntityStatus[] = ["PLANNED", "EXISTS", "OPEN_QUESTION"];

export type EntityInput = {
  name: string;
  orgNumber: string;
  kind: string;
  status: string;
  applicantTypes: string[];
  signatoryName: string;
  signatoryEmail: string;
  reviewerEmails: string;
};

export async function saveEntity(id: string | null, f: EntityInput): Promise<{ error?: string }> {
  await requireAdminSession();
  const name = f.name.trim().slice(0, 200);
  if (!name) return { error: "Skriv ett namn" };
  if (!KINDS.includes(f.kind as GoodTribesEntityKind) || !STATUSES.includes(f.status as GoodTribesEntityStatus)) return { error: "Okänd typ eller status" };
  const emails = f.reviewerEmails.split(/[,\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  const reviewers = emails.length ? await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } }) : [];
  const unknown = emails.filter((e) => !reviewers.some((r) => r.email?.toLowerCase() === e));
  if (unknown.length) return { error: `Hittar inga konton för: ${unknown.join(", ")}` };
  const data = {
    name,
    foundationAbOrgNumber: f.orgNumber.trim().slice(0, 40) || null,
    kind: f.kind as GoodTribesEntityKind,
    status: f.status as GoodTribesEntityStatus,
    applicantTypes: f.applicantTypes.filter((t): t is FundingApplicantType => APPLICANT_TYPES.includes(t as FundingApplicantType)),
    signatoryName: f.signatoryName.trim().slice(0, 200) || null,
    signatoryEmail: f.signatoryEmail.trim().slice(0, 200) || null,
    reviewers: { set: reviewers.map((r) => ({ id: r.id })) },
  };
  if (id) await prisma.commercialUmbrellaEntity.update({ where: { id }, data });
  else await prisma.commercialUmbrellaEntity.create({ data: { ...data, reviewers: { connect: reviewers.map((r) => ({ id: r.id })) } } });
  revalidatePath("/site-admin/entities");
  return {};
}
