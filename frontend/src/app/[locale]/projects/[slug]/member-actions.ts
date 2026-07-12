"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { hasProjectRole, isLastFounder, PROJECT_LEAD_ROLES, type ProjectRole } from "@/lib/authz";


export async function removeMember(projectId: string, targetUserId: string, slug: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await hasProjectRole(projectId, session.user.id, PROJECT_LEAD_ROLES))) return;

  const target = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!target) return;
  if (await isLastFounder(projectId, targetUserId)) return;

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  revalidatePath(`/projects/${slug}`);
}

export async function changeMemberRole(
  projectId: string,
  targetUserId: string,
  role: ProjectRole,
  slug: string,
) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await hasProjectRole(projectId, session.user.id, PROJECT_LEAD_ROLES))) return;

  const target = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!target) return;
  if (await isLastFounder(projectId, targetUserId)) return;

  if (role === "FOUNDER") {
    // Promoting a peer to equal-authority founder is a founder-only privilege.
    if (!(await hasProjectRole(projectId, session.user.id, ["FOUNDER"]))) return;
  } else if (!(["ADMIN", "MEMBER", "FOLLOWER"] as ProjectRole[]).includes(role)) {
    return;
  }

  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    data: { role },
  });
  revalidatePath(`/projects/${slug}`);
}
