"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email";


export async function sendOrgInvite(orgId: string, slug: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const email = (formData.get("email") as string).trim().toLowerCase();
  if (!email) return;

  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { name: true, ownerId: true },
  });
  if (!org || org.ownerId !== session.user.id) return;

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.orgInvite.create({
    data: { orgId, email, createdById: session.user.id, expiresAt },
  });

  const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";
  await sendEmail({
    to: email,
    subject: `You're invited to join ${org.name} on GoodTribes`,
    html: `
      <p>Hi,</p>
      <p>You've been invited to join <strong>${org.name}</strong> on GoodTribes.</p>
      <p><a href="${base}/invite/org/${invite.token}" style="background:#E85D4A;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0;">Accept invitation →</a></p>
      <p style="color:#888;font-size:12px;">This invitation expires in 7 days.</p>
    `,
  });
}
