"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hasProjectRole, isSiteAdmin, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { createNotification } from "@/lib/notify";

async function isProjectFounder(projectId: string, userId: string) {
  return hasProjectRole(projectId, userId, PROJECT_LEAD_ROLES);
}

export async function markProjectAbandoned(slug: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (!project) return { error: "Project not found" };
  if (!(await isProjectFounder(project.id, session.user.id))) return { error: "Forbidden" };

  await prisma.project.update({ where: { slug }, data: { abandonedAt: new Date() } });
  revalidatePath(`/projects/${slug}`);
  return { ok: true };
}

export async function unmarkProjectAbandoned(slug: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (!project) return { error: "Project not found" };
  if (!(await isProjectFounder(project.id, session.user.id))) return { error: "Forbidden" };

  await prisma.$transaction([
    prisma.project.update({ where: { slug }, data: { abandonedAt: null } }),
    prisma.projectOwnershipInterest.deleteMany({ where: { projectId: project.id } }),
  ]);
  revalidatePath(`/projects/${slug}`);
  return { ok: true };
}

export async function expressOwnershipInterest(slug: string, message: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, abandonedAt: true, title: true } });
  if (!project) return { error: "Project not found" };
  if (!project.abandonedAt) return { error: "Project is not looking for a new owner" };

  await prisma.projectOwnershipInterest.upsert({
    where: { projectId_userId: { projectId: project.id, userId: session.user.id } },
    create: { projectId: project.id, userId: session.user.id, message: message.trim() || null },
    update: { message: message.trim() || null },
  });

  const founders = await prisma.projectMember.findMany({
    where: { projectId: project.id, role: { in: PROJECT_LEAD_ROLES } },
    select: { userId: true },
  });
  await Promise.all(
    founders.map((f) =>
      createNotification({
        userId: f.userId,
        type: "ownership_interest",
        title: `Någon vill ta över ${project.title}`,
        url: `/projects/${slug}/edit`,
      })
    )
  );

  revalidatePath(`/projects/${slug}`);
  return { ok: true };
}

export async function withdrawOwnershipInterest(slug: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (!project) return { error: "Project not found" };

  await prisma.projectOwnershipInterest.deleteMany({
    where: { projectId: project.id, userId: session.user.id },
  });
  revalidatePath(`/projects/${slug}`);
  return { ok: true };
}

export async function transferOwnership(slug: string, newOwnerUserId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (!project) return { error: "Project not found" };

  const viewerIsFounder = await isProjectFounder(project.id, session.user.id);
  const viewerIsSiteAdmin = await isSiteAdmin(session.user.id);
  if (!viewerIsFounder && !viewerIsSiteAdmin) return { error: "Forbidden" };

  await prisma.$transaction([
    prisma.project.update({
      where: { slug },
      data: { ownerId: newOwnerUserId, abandonedAt: null },
    }),
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: newOwnerUserId } },
      create: { projectId: project.id, userId: newOwnerUserId, role: "FOUNDER" },
      update: { role: "FOUNDER" },
    }),
    prisma.projectOwnershipInterest.deleteMany({ where: { projectId: project.id } }),
  ]);

  await createNotification({
    userId: newOwnerUserId,
    type: "ownership_transferred",
    title: "Du är nu ägare av projektet",
    url: `/projects/${slug}`,
  });

  revalidatePath(`/projects/${slug}`);
  return { ok: true };
}
