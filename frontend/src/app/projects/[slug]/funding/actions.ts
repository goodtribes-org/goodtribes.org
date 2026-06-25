"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

export async function createCampaign(projectId: string, slug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: session.user.id } },
  });
  if (!member || !["owner", "admin"].includes(member.role)) redirect(`/projects/${slug}/funding`);

  const title = (formData.get("title") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const goal = parseInt(formData.get("goal") as string, 10);

  if (!title || isNaN(goal) || goal <= 0) return;

  await prisma.fundingCampaign.create({
    data: { projectId, title, description, goal },
  });

  revalidatePath(`/projects/${slug}/funding`);
}

export async function pledge(campaignId: string, slug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const amount = parseInt(formData.get("amount") as string, 10);
  const message = (formData.get("message") as string | null)?.trim() || null;

  if (isNaN(amount) || amount <= 0) return;

  await prisma.fundingPledge.upsert({
    where: { campaignId_userId: { campaignId, userId: session.user.id } },
    create: { campaignId, userId: session.user.id, amount, message },
    update: { amount, message },
  });

  revalidatePath(`/projects/${slug}/funding`);
}

export async function closeCampaign(campaignId: string, slug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const campaign = await prisma.fundingCampaign.findUnique({
    where: { id: campaignId },
    include: { project: { select: { members: { where: { userId: session.user.id } } } } },
  });
  const role = campaign?.project.members[0]?.role;
  if (!role || !["owner", "admin"].includes(role)) return;

  await prisma.fundingCampaign.update({ where: { id: campaignId }, data: { status: "closed" } });
  revalidatePath(`/projects/${slug}/funding`);
}
