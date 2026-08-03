"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slugify";
import { getProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { sanitizeHtml } from "@/lib/sanitizeHtml";


async function requireMember(projectSlug: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return null;
  const role = await getProjectRole(project.id, userId);
  return role ? { role } : null;
}

// Walks the tree under rootId so a page can never be re-parented into one
// of its own descendants (which would create a cycle the sidebar tree
// couldn't render).
export async function getDescendantIds(rootId: string, projectSlug: string): Promise<Set<string>> {
  const all = await prisma.wikiPage.findMany({ where: { projectSlug }, select: { id: true, parentId: true } });
  const childrenOf = new Map<string, string[]>();
  for (const p of all) {
    if (!p.parentId) continue;
    childrenOf.set(p.parentId, [...(childrenOf.get(p.parentId) ?? []), p.id]);
  }
  const descendants = new Set<string>();
  const queue = [...(childrenOf.get(rootId) ?? [])];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (descendants.has(id)) continue;
    descendants.add(id);
    queue.push(...(childrenOf.get(id) ?? []));
  }
  return descendants;
}

async function resolveParentId(
  projectSlug: string,
  formData: FormData,
  currentId?: string
): Promise<{ error: string } | { parentId: string | null }> {
  const raw = (formData.get("parentId") as string | null) ?? "";
  if (!raw) return { parentId: null };

  const parent = await prisma.wikiPage.findUnique({ where: { id: raw } });
  if (!parent || parent.projectSlug !== projectSlug) return { error: "Okänd överordnad sida." };

  if (currentId) {
    if (raw === currentId) return { error: "En sida kan inte vara sin egen överordnade." };
    const descendants = await getDescendantIds(currentId, projectSlug);
    if (descendants.has(raw)) return { error: "Kan inte flytta en sida under sin egen undersida." };
  }

  return { parentId: raw };
}

export async function createWikiPage(projectSlug: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const member = await requireMember(projectSlug, session.user.id);
  if (!member || !PROJECT_LEAD_ROLES.includes(member.role)) return;

  const title = (formData.get("title") as string).trim();
  if (!title) return;
  const content = sanitizeHtml((formData.get("content") as string | null)?.trim() ?? "");

  const baseSlug = slugify(title) || "page";
  let pageSlug = baseSlug;
  for (let i = 1; i <= 9; i++) {
    const exists = await prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug, slug: pageSlug } } });
    if (!exists) break;
    pageSlug = `${baseSlug}-${i}`;
  }

  const parentResult = await resolveParentId(projectSlug, formData);
  const parentId = "parentId" in parentResult ? parentResult.parentId : null;

  const maxOrder = await prisma.wikiPage.aggregate({ where: { projectSlug }, _max: { order: true } });
  await prisma.wikiPage.create({
    data: { projectSlug, slug: pageSlug, title, content, parentId, order: (maxOrder._max.order ?? -1) + 1, createdById: session.user.id },
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
  const content = sanitizeHtml((formData.get("content") as string | null)?.trim() ?? "");
  if (!title) return;

  const parentResult = await resolveParentId(projectSlug, formData, id);

  await prisma.wikiPage.update({
    where: { id },
    data: {
      title,
      content,
      updatedById: session.user.id,
      ...("parentId" in parentResult ? { parentId: parentResult.parentId } : {}),
    },
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
