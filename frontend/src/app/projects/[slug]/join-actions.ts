"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/notify";
import { logActivity } from "@/lib/activity";
import { sendEmail } from "@/lib/email";

const prisma = new PrismaClient();

export async function requestToJoin(projectId: string, slug: string, message: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.projectJoinRequest.upsert({
    where: { projectId_userId: { projectId, userId: session.user.id } },
    create: { projectId, userId: session.user.id, message, status: "pending" },
    update: { message, status: "pending" },
  });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { where: { role: { in: ["owner", "admin"] } } } },
  });

  if (project) {
    const requester = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    await Promise.all(
      project.members.map((m) =>
        createNotification({
          userId: m.userId,
          type: "join_request",
          title: `${requester?.name ?? "Someone"} wants to join ${project.title}`,
          body: message || undefined,
          url: `/projects/${slug}`,
        })
      )
    );

    const owners = project.members.filter((m) => ["owner", "admin"].includes(m.role));
    const ownerUsers = await prisma.user.findMany({
      where: { id: { in: owners.map((m) => m.userId) } },
      select: { email: true, name: true },
    });
    const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";
    await Promise.all(
      ownerUsers
        .filter((u) => u.email)
        .map((u) =>
          sendEmail({
            to: u.email!,
            subject: `New join request for ${project.title}`,
            html: `<p>Hi ${u.name ?? "there"},</p><p><strong>${requester?.name ?? "Someone"}</strong> wants to join <strong>${project.title}</strong>.</p>${message ? `<p style="color:#666;font-style:italic;">"${message}"</p>` : ""}<p><a href="${base}/projects/${slug}" style="background:#E85D4A;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0;">Review request →</a></p>`,
          }).catch(() => {})
        )
    );
  }

  revalidatePath(`/projects/${slug}`);
}

export async function respondToJoinRequest(
  requestId: string,
  decision: "approved" | "rejected",
  slug: string
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const req = await prisma.projectJoinRequest.update({
    where: { id: requestId },
    data: { status: decision },
    include: { project: { select: { title: true } } },
  });

  if (decision === "approved") {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: req.projectId, userId: req.userId } },
      create: { projectId: req.projectId, userId: req.userId, role: "collaborator" },
      update: {},
    });
    await logActivity(req.projectId, req.userId, "member_joined");
  }

  await createNotification({
    userId: req.userId,
    type: decision === "approved" ? "join_approved" : "join_rejected",
    title:
      decision === "approved"
        ? `You're now a member of ${req.project.title}`
        : `Your request to join ${req.project.title} was not approved`,
    url: decision === "approved" ? `/projects/${slug}` : "/projects",
  });

  if (decision === "approved") {
    const requester = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true, name: true } });
    if (requester?.email) {
      const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";
      await sendEmail({
        to: requester.email,
        subject: `You're now a member of ${req.project.title}`,
        html: `
          <p>Hi ${requester.name ?? "there"},</p>
          <p>Your request to join <strong>${req.project.title}</strong> has been approved. Welcome aboard!</p>
          <p><a href="${base}/projects/${slug}" style="background:#E85D4A;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0;">Open project →</a></p>
        `,
      });
    }
  }

  revalidatePath(`/projects/${slug}`);
}
