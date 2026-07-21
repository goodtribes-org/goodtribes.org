"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/notify";
import { logActivity, logOrgActivity } from "@/lib/activity";
import { ORG_LEAD_ROLES } from "@/lib/org-authz";
import { PROJECT_LEAD_ROLES } from "@/lib/authz";
import {
  canProposePartnership,
  canRespondToPartnership,
  canRevokePartnership,
} from "@/lib/partnershipAuthz";

// A partnership is a two-sided resource with no single natural "owner"
// directory (org vs project side), so its actions live here rather than
// colocated under one side's folder — both org/[slug]/partnerships/page.tsx
// and projects/[slug]/(workspace)/partnerships/page.tsx call into this file.

// Both sides are identified by slug (not id) since that's what the propose
// form on either side naturally has at hand — the org page already knows its
// own org, but only the *other* side's human-readable slug for the lookup,
// and vice versa on the project side.
export async function proposePartnership(
  side: "org" | "project",
  organisationSlug: string,
  projectSlug: string,
  type: string,
  description: string | null
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [org, project] = await Promise.all([
    prisma.organisation.findUnique({
      where: { slug: organisationSlug },
      select: { id: true, name: true, slug: true, members: { where: { role: { in: ORG_LEAD_ROLES } }, select: { userId: true } } },
    }),
    prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, title: true, slug: true, members: { where: { role: { in: PROJECT_LEAD_ROLES } }, select: { userId: true } } },
    }),
  ]);
  if (!org || !project) throw new Error("Organisationen eller projektet hittades inte");

  if (!(await canProposePartnership(side, org.id, project.id, userId))) {
    throw new Error("Forbidden");
  }

  await prisma.partnership.upsert({
    where: { projectId_organisationId: { projectId: project.id, organisationId: org.id } },
    create: { projectId: project.id, organisationId: org.id, type, description, proposedBy: side, initiatedById: userId, status: "pending" },
    update: { type, description, proposedBy: side, initiatedById: userId, status: "pending", respondedById: null, respondedAt: null },
  });

  const recipients = side === "org" ? project.members.map((m) => m.userId) : org.members.map((m) => m.userId);
  const title =
    side === "org"
      ? `${org.name} vill bli partner med ${project.title}`
      : `${project.title} vill knyta er organisation ${org.name} som partner`;
  const url = side === "org" ? `/projects/${project.slug}/partnerships` : `/org/${org.slug}/partnerships`;

  await Promise.all(
    recipients.map((recipientId) =>
      createNotification({ userId: recipientId, type: "partnership_proposed", title, url })
    )
  );

  revalidatePath(`/org/${org.slug}/partnerships`);
  revalidatePath(`/projects/${project.slug}/partnerships`);
}

export async function respondToPartnership(partnershipId: string, decision: "active" | "declined") {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const partnership = await prisma.partnership.findUnique({
    where: { id: partnershipId },
    include: {
      organisation: { select: { id: true, name: true, slug: true } },
      project: { select: { id: true, title: true, slug: true } },
    },
  });
  if (!partnership || partnership.status !== "pending") return;

  if (!(await canRespondToPartnership(partnership.proposedBy, partnership.organisation.id, partnership.project.id, userId))) {
    throw new Error("Forbidden");
  }

  await prisma.partnership.update({
    where: { id: partnershipId },
    data: { status: decision, respondedById: userId, respondedAt: new Date() },
  });

  if (decision === "active") {
    await Promise.all([
      logActivity(partnership.project.id, userId, "partnership_activated", { organisationId: partnership.organisation.id }),
      logOrgActivity(partnership.organisation.id, userId, "partnership_activated", { projectId: partnership.project.id }),
    ]);
  }

  await createNotification({
    userId: partnership.initiatedById,
    type: decision === "active" ? "partnership_activated" : "partnership_declined",
    title:
      decision === "active"
        ? `Partnerskapet mellan ${partnership.organisation.name} och ${partnership.project.title} är aktivt`
        : `Partnerskapsförslaget mellan ${partnership.organisation.name} och ${partnership.project.title} avvisades`,
    url: `/projects/${partnership.project.slug}/partnerships`,
  });

  revalidatePath(`/org/${partnership.organisation.slug}/partnerships`);
  revalidatePath(`/projects/${partnership.project.slug}/partnerships`);
}

export async function revokePartnership(partnershipId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const partnership = await prisma.partnership.findUnique({
    where: { id: partnershipId },
    include: {
      organisation: { select: { id: true, slug: true } },
      project: { select: { id: true, slug: true } },
    },
  });
  if (!partnership || partnership.status !== "active") return;

  if (!(await canRevokePartnership(partnership.organisation.id, partnership.project.id, userId))) {
    throw new Error("Forbidden");
  }

  await prisma.partnership.update({
    where: { id: partnershipId },
    data: { status: "revoked", respondedById: userId, respondedAt: new Date() },
  });

  revalidatePath(`/org/${partnership.organisation.slug}/partnerships`);
  revalidatePath(`/projects/${partnership.project.slug}/partnerships`);
}
