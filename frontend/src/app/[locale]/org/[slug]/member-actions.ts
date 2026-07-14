"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import type { OrganisationRole } from "@prisma/client";

const ASSIGNABLE_ROLES: OrganisationRole[] = ["ADMIN", "MEMBER"];

export async function removeOrgMember(orgId: string, targetUserId: string, slug: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  const org = await prisma.organisation.findUnique({ where: { id: orgId }, select: { ownerId: true } });
  if (!org || org.ownerId !== session.user.id) return;
  if (targetUserId === org.ownerId) return;

  await prisma.organisationMember.delete({
    where: { organisationId_userId: { organisationId: orgId, userId: targetUserId } },
  });
  revalidatePath(`/org/${slug}`);
}

export async function changeOrgMemberRole(
  orgId: string,
  targetUserId: string,
  role: string,
  slug: string,
) {
  const session = await auth();
  if (!session?.user?.id) return;

  const org = await prisma.organisation.findUnique({ where: { id: orgId }, select: { ownerId: true } });
  if (!org || org.ownerId !== session.user.id) return;
  if (targetUserId === org.ownerId) return;
  if (!ASSIGNABLE_ROLES.includes(role as OrganisationRole)) return;
  const nextRole = role as OrganisationRole;

  await prisma.organisationMember.update({
    where: { organisationId_userId: { organisationId: orgId, userId: targetUserId } },
    data: { role: nextRole },
  });
  revalidatePath(`/org/${slug}`);
}
