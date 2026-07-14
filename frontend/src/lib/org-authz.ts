import { prisma } from "@/lib/prisma";
import type { OrganisationRole } from "@prisma/client";
import { isSiteAdmin } from "@/lib/authz";

export type { OrganisationRole };

export const ORG_LEAD_ROLES: OrganisationRole[] = ["OWNER", "ADMIN"];

export async function getOrgRole(
  organisationId: string,
  userId: string
): Promise<OrganisationRole | null> {
  const member = await prisma.organisationMember.findUnique({
    where: { organisationId_userId: { organisationId, userId } },
  });
  return member?.role ?? null;
}

export async function hasOrgRole(
  organisationId: string,
  userId: string,
  allowed: OrganisationRole[]
): Promise<boolean> {
  const role = await getOrgRole(organisationId, userId);
  return role !== null && allowed.includes(role);
}

// Throws for Server Actions/route handlers that should hard-stop on
// unauthorized access. Site admins bypass org-level checks by default,
// matching requireProjectRole's convention — pass { allowSiteAdmin: false }
// to opt out for a specific call site.
export async function requireOrgRole(
  organisationId: string,
  userId: string,
  allowed: OrganisationRole[],
  opts: { allowSiteAdmin?: boolean } = {}
): Promise<void> {
  const { allowSiteAdmin = true } = opts;
  if (await hasOrgRole(organisationId, userId, allowed)) return;
  if (allowSiteAdmin && (await isSiteAdmin(userId))) return;
  throw new Error("Forbidden");
}

// True if userId is the sole remaining owner on this organisation — mirrors
// isLastFounder, for future ownership-transfer flows (an org can have any
// number of equal-authority owners; this only fires when exactly one remains).
export async function isLastOrgOwner(organisationId: string, userId: string): Promise<boolean> {
  const member = await prisma.organisationMember.findUnique({
    where: { organisationId_userId: { organisationId, userId } },
  });
  if (!member || member.role !== "OWNER") return false;

  const ownerCount = await prisma.organisationMember.count({
    where: { organisationId, role: "OWNER" },
  });
  return ownerCount <= 1;
}
