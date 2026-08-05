"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notify";
import { logActivity } from "@/lib/activity";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/renderBody";
import { hasProjectRole, isLastFounder, isSiteAdmin, isExcludedFromProject, PROJECT_LEAD_ROLES, type ProjectRole } from "@/lib/authz";

// Project leads (founder/admin) and site admins can search any user not
// already on the project and add them directly, bypassing the
// invite/join-request flow — pull in people without waiting on them to
// accept/apply.
async function canAddMembersDirectly(projectId: string, userId: string): Promise<boolean> {
  if (await isSiteAdmin(userId)) return true;
  return hasProjectRole(projectId, userId, PROJECT_LEAD_ROLES);
}

export async function searchUsersToAdd(
  query: string,
  projectId: string
): Promise<{ id: string; name: string | null; image: string | null; email: string }[]> {
  const session = await auth();
  if (!session?.user?.id || !(await canAddMembersDirectly(projectId, session.user.id))) return [];

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

// Pending (not-yet-accepted) email invites — founder/admin/site-admin only,
// same gate as sending them in the first place. Emails are semi-private, so
// this is checked here rather than just relying on the caller only ever
// rendering the list for a lead.
export async function getPendingInvites(
  projectId: string
): Promise<{ id: string; email: string | null; createdAt: string; expiresAt: string }[]> {
  const session = await auth();
  if (!session?.user?.id || !(await canAddMembersDirectly(projectId, session.user.id))) return [];

  const invites = await prisma.projectInvite.findMany({
    where: { projectId, usedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, createdAt: true, expiresAt: true },
  });
  return invites.map((i) => ({ ...i, createdAt: i.createdAt.toISOString(), expiresAt: i.expiresAt.toISOString() }));
}

export async function addMemberDirectly(projectId: string, targetUserId: string, slug: string) {
  const session = await auth();
  if (!session?.user?.id || !(await canAddMembersDirectly(projectId, session.user.id))) return;

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

// For an email that doesn't match any existing account — same direct-add
// UI, but falls back to the invite-link flow since there's no user to
// attach a ProjectMember row to yet.
export async function inviteMemberByEmail(
  projectId: string,
  slug: string,
  emailInput: string,
  personalMessage?: string
): Promise<{ error: string } | { ok: true }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  if (!(await canAddMembersDirectly(projectId, session.user.id))) return { error: "Forbidden" };

  const email = emailInput.trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Ogiltig e-postadress." };

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return { error: "Den e-postadressen har redan ett konto — sök på namn eller e-post ovan istället." };

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { title: true } });
  if (!project) return { error: "Projektet hittades inte." };

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invite = await prisma.projectInvite.create({
    data: { projectId, email, createdById: session.user.id, expiresAt },
  });

  const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";
  const url = `${base}/invite/${invite.token}`;

  const trimmedMessage = personalMessage?.trim();
  // Free text from the inviter — escape before it ever reaches the HTML
  // email template, same rule as any other user-authored text rendered as
  // HTML (see escapeHtml's own doc comment).
  const messageHtml = trimmedMessage
    ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #E85D4A;background:#f9f9f9;color:#333;font-style:italic;">${escapeHtml(trimmedMessage).replace(/\n/g, "<br>")}</blockquote>`
    : "";

  await sendEmail({
    to: email,
    subject: `You're invited to join ${project.title} on GoodTribes`,
    html: `
      <p>Hi,</p>
      <p><strong>${session.user.name ?? "Someone"}</strong> has invited you to join <strong>${project.title}</strong> on GoodTribes.org.</p>
      ${messageHtml}
      <p><a href="${url}" style="background:#E85D4A;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0;">Accept invitation</a></p>
      <p>This link expires in 7 days.</p>
      <p style="color:#888;font-size:12px;">If you didn't expect this email, you can safely ignore it.</p>
    `,
  });

  revalidatePath(`/projects/${slug}`);
  return { ok: true };
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
