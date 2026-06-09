"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function requestToJoin(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const orgId = formData.get("orgId") as string;

  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { id: true, slug: true, ownerId: true },
  });
  if (!org || org.ownerId === session.user.id) return;

  const alreadyMember = await prisma.organisationMember.findUnique({
    where: { organisationId_userId: { organisationId: orgId, userId: session.user.id } },
  });
  if (alreadyMember) return;

  await prisma.organisationJoinRequest.upsert({
    where: { organisationId_userId: { organisationId: orgId, userId: session.user.id } },
    create: { organisationId: orgId, userId: session.user.id },
    update: {},
  });

  revalidatePath(`/org/${org.slug}`);
}
