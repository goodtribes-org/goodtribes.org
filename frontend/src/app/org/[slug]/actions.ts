"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notify";
import { sendEmail } from "@/lib/email";


export async function requestToJoin(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const orgId = formData.get("orgId") as string;

  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      slug: true,
      name: true,
      ownerId: true,
      owner: { select: { email: true, name: true } },
    },
  });
  if (!org || org.ownerId === session.user.id) return;

  const alreadyMember = await prisma.organisationMember.findUnique({
    where: { organisationId_userId: { organisationId: orgId, userId: session.user.id } },
  });
  if (alreadyMember) return;

  await prisma.organisationJoinRequest.upsert({
    where: { organisationId_userId: { organisationId: orgId, userId: session.user.id } },
    create: { organisationId: orgId, userId: session.user.id },
    update: {},
  });

  const requester = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  try {
    await createNotification({
      userId: org.ownerId,
      type: "join_request",
      title: `${requester?.name ?? "Someone"} wants to join ${org.name}`,
      url: `/org/${org.slug}`,
    });
  } catch {}

  if (org.owner.email) {
    const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";
    try {
      await sendEmail({
        to: org.owner.email,
        subject: `New join request for ${org.name}`,
        html: `
          <p>Hi ${org.owner.name ?? "there"},</p>
          <p><strong>${requester?.name ?? "Someone"}</strong> has requested to join <strong>${org.name}</strong>.</p>
          <p><a href="${base}/org/${org.slug}" style="background:#E85D4A;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0;">Review request →</a></p>
        `,
      });
    } catch {}
  }

  revalidatePath(`/org/${org.slug}`);
}

export async function respondToOrgJoinRequest(
  requestId: string,
  decision: "approved" | "rejected",
  slug: string
) {
  const session = await auth();
  if (!session?.user?.id) return;

  const req = await prisma.organisationJoinRequest.findUnique({
    where: { id: requestId },
    include: {
      organisation: { select: { name: true, ownerId: true } },
      user: { select: { id: true, email: true, name: true } },
    },
  });
  if (!req || req.organisation.ownerId !== session.user.id) return;

  await prisma.organisationJoinRequest.update({
    where: { id: requestId },
    data: { status: decision },
  });

  if (decision === "approved") {
    await prisma.organisationMember.upsert({
      where: { organisationId_userId: { organisationId: req.organisationId, userId: req.userId } },
      create: { organisationId: req.organisationId, userId: req.userId },
      update: {},
    });
  }

  try {
    await createNotification({
      userId: req.userId,
      type: decision === "approved" ? "join_approved" : "join_rejected",
      title:
        decision === "approved"
          ? `You're now a member of ${req.organisation.name}`
          : `Your request to join ${req.organisation.name} was not approved`,
      url: decision === "approved" ? `/org/${slug}` : "/org",
    });
  } catch {}

  if (req.user.email) {
    const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";
    try {
      await sendEmail({
        to: req.user.email,
        subject:
          decision === "approved"
            ? `You're now a member of ${req.organisation.name}`
            : `Your request to join ${req.organisation.name}`,
        html:
          decision === "approved"
            ? `<p>Hi ${req.user.name ?? "there"},</p><p>Your request to join <strong>${req.organisation.name}</strong> has been approved. Welcome!</p><p><a href="${base}/org/${slug}" style="background:#E85D4A;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0;">Open organisation →</a></p>`
            : `<p>Hi ${req.user.name ?? "there"},</p><p>Your request to join <strong>${req.organisation.name}</strong> was not approved at this time.</p>`,
      });
    } catch {}
  }

  revalidatePath(`/org/${slug}`);
}
