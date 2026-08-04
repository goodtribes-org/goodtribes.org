"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { isExcludedFromProject } from "@/lib/authz";


export async function acceptInvite(token: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/invite/${token}`);

  const invite = await prisma.projectInvite.findUnique({
    where: { token },
    include: { project: { select: { slug: true } } },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    redirect("/projects");
  }

  // The invite is only valid for the address it was sent to — otherwise
  // anyone who gets hold of the link (forwarded, leaked, guessed) could
  // join regardless of who it was actually meant for. The page itself
  // shows this same check up front so this is a defense-in-depth guard,
  // not the primary UX.
  if (invite.email && session.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    redirect(`/invite/${token}`);
  }

  // A Granskningsrådet project_ban blocks rejoining via invite too.
  if (await isExcludedFromProject(session.user.id, invite.projectId)) {
    redirect("/projects");
  }

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: invite.projectId, userId: session.user.id } },
    create: { projectId: invite.projectId, userId: session.user.id, role: invite.role },
    update: {},
  });

  await prisma.projectInvite.update({ where: { token }, data: { usedAt: new Date() } });
  await logActivity(invite.projectId, session.user.id, "member_joined");

  redirect(`/projects/${invite.project.slug}`);
}
