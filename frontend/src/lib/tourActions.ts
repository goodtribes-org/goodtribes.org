"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { hasOrgRole, ORG_LEAD_ROLES } from "@/lib/org-authz";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";


export async function dismissTour(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { tourDismissedAt: new Date() },
  });
}

export async function dismissOrgTour(organisationId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await hasOrgRole(organisationId, session.user.id, ORG_LEAD_ROLES))) return;

  await prisma.organisation.update({
    where: { id: organisationId },
    data: { tourDismissedAt: new Date() },
  });
}

export async function dismissProjectChecklist(projectId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await hasProjectRole(projectId, session.user.id, PROJECT_LEAD_ROLES))) return;

  await prisma.project.update({
    where: { id: projectId },
    data: { checklistDismissedAt: new Date() },
  });
}
