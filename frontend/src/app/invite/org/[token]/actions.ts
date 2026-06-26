"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";


export async function acceptOrgInvite(token: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { org: { select: { slug: true } } },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    redirect("/org");
  }

  await prisma.$transaction([
    prisma.organisationMember.upsert({
      where: { organisationId_userId: { organisationId: invite.orgId, userId: session.user.id } },
      create: { organisationId: invite.orgId, userId: session.user.id, role: invite.role },
      update: {},
    }),
    prisma.orgInvite.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect(`/org/${invite.org.slug}`);
}
