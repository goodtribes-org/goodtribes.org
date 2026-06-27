"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";


export async function postMessage(projectId: string, slug: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const isMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: session.user.id } },
  });
  if (!isMember) return;

  const body = (formData.get("body") as string).trim();
  if (!body || body.length > 2000) return;

  await prisma.projectMessage.create({
    data: { projectId, authorId: session.user.id, body },
  });

  revalidatePath(`/projects/${slug}/chat`);
}

export async function generateInviteLink(projectId: string, _slug: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) return "";

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: session.user.id } },
  });
  if (!membership || !["owner", "admin"].includes(membership.role)) return "";

  const invite = await prisma.projectInvite.create({
    data: {
      projectId,
      email: null,
      token: undefined,
      role: "collaborator",
      createdById: session.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";
  return `${base}/invite/${invite.token}`;
}
