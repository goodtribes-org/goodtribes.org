"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

async function getOwnerOrAdmin(projectId: string, userId: string) {
  return prisma.projectMember.findFirst({
    where: { projectId, userId, role: { in: ["owner", "admin"] } },
  });
}

export async function removeMember(projectId: string, targetUserId: string, slug: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await getOwnerOrAdmin(projectId, session.user.id))) return;

  const target = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!target || target.role === "owner") return;

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  revalidatePath(`/projects/${slug}`);
}

export async function changeMemberRole(
  projectId: string,
  targetUserId: string,
  role: string,
  slug: string,
) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await getOwnerOrAdmin(projectId, session.user.id))) return;

  const target = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!target || target.role === "owner") return;
  if (!["admin", "collaborator", "follower"].includes(role)) return;

  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    data: { role },
  });
  revalidatePath(`/projects/${slug}`);
}
