"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { deleteDocument } from "@/lib/meili";


export async function leaveProject(projectId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: session.user.id } },
  });
  if (!membership || membership.role === "owner") return;

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: session.user.id } },
  });

  redirect("/projects");
}

export async function deleteProject(slug: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const project = await prisma.project.findUnique({
    where: { slug },
    include: { members: { where: { userId: session.user.id, role: "owner" } } },
  });
  if (!project || project.members.length === 0) return;

  await prisma.project.delete({ where: { slug } });
  await deleteDocument("projects", `project-${slug}`);

  redirect("/projects");
}
