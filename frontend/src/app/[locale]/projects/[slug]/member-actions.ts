"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notify";
import { logActivity } from "@/lib/activity";
import { sendEmail } from "@/lib/email";
import { hasProjectRole, isLastFounder, isSiteAdmin, isExcludedFromProject, PROJECT_LEAD_ROLES, type ProjectRole } from "@/lib/authz";

// Site admins can search any user not already on the project — used to add
// members directly, bypassing the invite/join-request flow (founder
// capability: pull in people without waiting on them to accept/apply).
export async function searchUsersToAdd(
  query: string,
  projectId: string
): Promise<{ id: string; name: string | null; image: string | null; email: string }[]> {
  const session = await auth();
  if (!session?.user?.id || !(await isSiteAdmin(session.user.id))) return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  return prisma.user.findMany({
    where: {
      projectMemberships: { none: { projectId } },
      OR: [
        { name: { contains: trimmed, mode: "insensitive" } },
        { email: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, image: true, email: true },
    take: 8,
    orderBy: { name: "asc" },
  });
}

export async function addMemberAsSiteAdmin(projectId: string, targetUserId: string, slug: string) {
  const session = await auth();
  if (!session?.user?.id || !(await isSiteAdmin(session.user.id))) return;

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (existing) return;
  if (await isExcludedFromProject(targetUserId, projectId)) return;

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { title: true } });
  if (!project) return;

  await prisma.projectMember.create({
    data: { projectId, userId: targetUserId, role: "MEMBER" },
  });
  await logActivity(projectId, targetUserId, "member_joined");

  await createNotification({
    userId: targetUserId,
    type: "added_to_project",
    title: `You've been added to ${project.title}`,
    url: `/projects/${slug}`,
  });

  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { email: true, name: true } });
  if (target?.email) {
    const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";
    await sendEmail({
      to: target.email,
      subject: `You've been added to ${project.title}`,
      html: `
        <p>Hi ${target.name ?? "there"},</p>
        <p>You've been added as a member of <strong>${project.title}</strong> on GoodTribes.org.</p>
        <p><a href="${base}/projects/${slug}" style="background:#E85D4A;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0;">Open project →</a></p>
      `,
    }).catch(() => {});
  }

  revalidatePath(`/projects/${slug}`);
}


export async function removeMember(projectId: string, targetUserId: string, slug: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await hasProjectRole(projectId, session.user.id, PROJECT_LEAD_ROLES)) && !(await isSiteAdmin(session.user.id))) return;

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
  const viewerIsSiteAdmin = await isSiteAdmin(session.user.id);
  if (!(await hasProjectRole(projectId, session.user.id, PROJECT_LEAD_ROLES)) && !viewerIsSiteAdmin) return;

  const target = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!target) return;
  if (await isLastFounder(projectId, targetUserId)) return;

  if (role === "FOUNDER") {
    // Promoting a peer to equal-authority founder is a founder-only privilege
    // (site admins bypass this too, same as every other project-role gate).
    if (!(await hasProjectRole(projectId, session.user.id, ["FOUNDER"])) && !viewerIsSiteAdmin) return;
  } else if (!(["ADMIN", "MEMBER", "FOLLOWER"] as ProjectRole[]).includes(role)) {
    return;
  }

  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    data: { role },
  });
  revalidatePath(`/projects/${slug}`);
}
