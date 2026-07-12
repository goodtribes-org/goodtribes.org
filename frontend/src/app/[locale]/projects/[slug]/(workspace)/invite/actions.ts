"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";


export async function sendInvite(projectId: string, slug: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  if (!(await hasProjectRole(projectId, session.user.id, PROJECT_LEAD_ROLES))) return;

  const email = (formData.get("email") as string).trim().toLowerCase();
  if (!email) return;

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { title: true } });
  if (!project) return;

  // 7-day expiry
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invite = await prisma.projectInvite.create({
    data: { projectId, email, createdById: session.user.id, expiresAt },
  });

  const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";
  const url = `${base}/invite/${invite.token}`;

  await sendEmail({
    to: email,
    subject: `You're invited to join ${project.title} on GoodTribes`,
    html: `
      <p>Hi,</p>
      <p><strong>${session.user.name ?? "Someone"}</strong> has invited you to join <strong>${project.title}</strong> on GoodTribes.org.</p>
      <p><a href="${url}" style="background:#E85D4A;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0;">Accept invitation</a></p>
      <p>This link expires in 7 days.</p>
      <p style="color:#888;font-size:12px;">If you didn't expect this email, you can safely ignore it.</p>
    `,
  });

  revalidatePath(`/projects/${slug}`);
}
