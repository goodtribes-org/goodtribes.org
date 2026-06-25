"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

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
  if (!["admin", "member"].includes(role)) return;

  await prisma.organisationMember.update({
    where: { organisationId_userId: { organisationId: orgId, userId: targetUserId } },
    data: { role },
  });
  revalidatePath(`/org/${slug}`);
}
