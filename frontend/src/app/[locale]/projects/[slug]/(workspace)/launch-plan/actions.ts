"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import type { ChannelPlanStatus } from "@prisma/client";

const VALID_STATUSES: ChannelPlanStatus[] = ["PLANNED", "ACTIVE", "DONE"];

async function requireLead(projectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return null;
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return null;
  return session.user.id;
}

export async function updateLaunchPlan(
  projectSlug: string,
  data: { targetAudience: string; positioning: string; budgetOverview: string; successMetrics: string }
) {
  const userId = await requireLead(projectSlug);
  if (!userId) return { error: "Not authorized" };

  await prisma.launchPlan.upsert({
    where: { projectSlug },
    create: {
      projectSlug,
      targetAudience: data.targetAudience.trim() || null,
      positioning: data.positioning.trim() || null,
      budgetOverview: data.budgetOverview.trim() || null,
      successMetrics: data.successMetrics.trim() || null,
      updatedById: userId,
    },
    update: {
      targetAudience: data.targetAudience.trim() || null,
      positioning: data.positioning.trim() || null,
      budgetOverview: data.budgetOverview.trim() || null,
      successMetrics: data.successMetrics.trim() || null,
      updatedById: userId,
    },
  });

  revalidatePath(`/projects/${projectSlug}/launch-plan`);
  return { ok: true };
}

async function ensureLaunchPlan(projectSlug: string) {
  return prisma.launchPlan.upsert({
    where: { projectSlug },
    create: { projectSlug },
    update: {},
  });
}

export async function addLaunchPlanChannel(
  projectSlug: string,
  data: { name: string; tactic: string; owner: string; budget: string; plannedDate: string; status: string }
) {
  const userId = await requireLead(projectSlug);
  if (!userId) return { error: "Not authorized" };

  const name = data.name.trim();
  if (!name) return { error: "Missing name" };
  const status = VALID_STATUSES.includes(data.status as ChannelPlanStatus) ? (data.status as ChannelPlanStatus) : "PLANNED";

  const plan = await ensureLaunchPlan(projectSlug);
  const channel = await prisma.launchPlanChannel.create({
    data: {
      launchPlanId: plan.id,
      name,
      tactic: data.tactic.trim() || null,
      owner: data.owner.trim() || null,
      budget: data.budget.trim() || null,
      plannedDate: data.plannedDate ? new Date(data.plannedDate) : null,
      status,
    },
  });

  revalidatePath(`/projects/${projectSlug}/launch-plan`);
  return { channel };
}

export async function deleteLaunchPlanChannel(channelId: string) {
  const channel = await prisma.launchPlanChannel.findUnique({
    where: { id: channelId },
    include: { launchPlan: { select: { projectSlug: true } } },
  });
  if (!channel) return { error: "Not found" };
  const userId = await requireLead(channel.launchPlan.projectSlug);
  if (!userId) return { error: "Not authorized" };

  await prisma.launchPlanChannel.delete({ where: { id: channelId } });
  revalidatePath(`/projects/${channel.launchPlan.projectSlug}/launch-plan`);
  return { ok: true };
}

export async function addLaunchPlanMilestone(
  projectSlug: string,
  data: { date: string; description: string }
) {
  const userId = await requireLead(projectSlug);
  if (!userId) return { error: "Not authorized" };

  const description = data.description.trim();
  if (!description || !data.date) return { error: "Missing required fields" };

  const plan = await ensureLaunchPlan(projectSlug);
  const milestone = await prisma.launchPlanMilestone.create({
    data: { launchPlanId: plan.id, date: new Date(data.date), description },
  });

  revalidatePath(`/projects/${projectSlug}/launch-plan`);
  return { milestone };
}

export async function toggleLaunchPlanMilestone(milestoneId: string, done: boolean) {
  const milestone = await prisma.launchPlanMilestone.findUnique({
    where: { id: milestoneId },
    include: { launchPlan: { select: { projectSlug: true } } },
  });
  if (!milestone) return { error: "Not found" };
  const userId = await requireLead(milestone.launchPlan.projectSlug);
  if (!userId) return { error: "Not authorized" };

  await prisma.launchPlanMilestone.update({ where: { id: milestoneId }, data: { done } });
  revalidatePath(`/projects/${milestone.launchPlan.projectSlug}/launch-plan`);
  return { ok: true };
}

export async function deleteLaunchPlanMilestone(milestoneId: string) {
  const milestone = await prisma.launchPlanMilestone.findUnique({
    where: { id: milestoneId },
    include: { launchPlan: { select: { projectSlug: true } } },
  });
  if (!milestone) return { error: "Not found" };
  const userId = await requireLead(milestone.launchPlan.projectSlug);
  if (!userId) return { error: "Not authorized" };

  await prisma.launchPlanMilestone.delete({ where: { id: milestoneId } });
  revalidatePath(`/projects/${milestone.launchPlan.projectSlug}/launch-plan`);
  return { ok: true };
}
