"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/notify";

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

  revalidatePath(`/projects/${slug}`);
}
