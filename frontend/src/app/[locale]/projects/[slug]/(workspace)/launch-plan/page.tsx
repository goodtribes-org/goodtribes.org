export const dynamic = "force-dynamic";

import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import LaunchPlanEditor from "./LaunchPlanEditor";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await notFoundUnlessVisible(slug);
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Lanserings- och marknadsplan` };
}

export default async function LaunchPlanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await notFoundUnlessVisible(slug);
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      launchPlan: {
        include: {
          channels: { orderBy: { createdAt: "asc" } },
          milestones: { orderBy: { date: "asc" } },
        },
      },
    },
  });
  if (!project) notFound();

  const canEdit = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;

  const plan = project.launchPlan;

  return (
    <LaunchPlanEditor
      projectSlug={slug}
      canEdit={canEdit}
      initial={{
        targetAudience: plan?.targetAudience ?? "",
        positioning: plan?.positioning ?? "",
        budgetOverview: plan?.budgetOverview ?? "",
        successMetrics: plan?.successMetrics ?? "",
      }}
      channels={plan?.channels ?? []}
      milestones={plan?.milestones ?? []}
    />
  );
}
