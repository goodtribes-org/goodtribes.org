"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slugify";
import { getProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";


async function requireMember(projectSlug: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return null;
  const role = await getProjectRole(project.id, userId);
  return role ? { role } : null;
}

export async function createWikiPage(projectSlug: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const member = await requireMember(projectSlug, session.user.id);
  if (!member || !PROJECT_LEAD_ROLES.includes(member.role)) return;

  const title = (formData.get("title") as string).trim();
  if (!title) return;
  const content = (formData.get("content") as string | null)?.trim() ?? "";

  const baseSlug = slugify(title) || "page";
  let pageSlug = baseSlug;
  for (let i = 1; i <= 9; i++) {
    const exists = await prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug, slug: pageSlug } } });
    if (!exists) break;
    pageSlug = `${baseSlug}-${i}`;
  }

  const maxOrder = await prisma.wikiPage.aggregate({ where: { projectSlug }, _max: { order: true } });
  await prisma.wikiPage.create({
    data: { projectSlug, slug: pageSlug, title, content, order: (maxOrder._max.order ?? -1) + 1, createdById: session.user.id },
  });

  revalidatePath(`/projects/${projectSlug}/wiki`);
  redirect(`/projects/${projectSlug}/wiki/${pageSlug}`);
}

export async function updateWikiPage(id: string, projectSlug: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const member = await requireMember(projectSlug, session.user.id);
  if (!member) return;

  const title = (formData.get("title") as string).trim();
  const content = (formData.get("content") as string | null)?.trim() ?? "";
  if (!title) return;

  await prisma.wikiPage.update({
    where: { id },
    data: { title, content, updatedById: session.user.id },
  });

  revalidatePath(`/projects/${projectSlug}/wiki`);
}

export async function deleteWikiPage(id: string, projectSlug: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const member = await requireMember(projectSlug, session.user.id);
  if (!member || !PROJECT_LEAD_ROLES.includes(member.role)) return;

  await prisma.wikiPage.delete({ where: { id } });
  revalidatePath(`/projects/${projectSlug}/wiki`);
  redirect(`/projects/${projectSlug}/wiki`);
}
