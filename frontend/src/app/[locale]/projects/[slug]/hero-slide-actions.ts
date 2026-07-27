"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hasProjectRole, isSiteAdmin, PROJECT_LEAD_ROLES } from "@/lib/authz";

async function canEditHero(projectId: string, userId: string) {
  return (await hasProjectRole(projectId, userId, PROJECT_LEAD_ROLES)) || (await isSiteAdmin(userId));
}

export async function addHeroSlide(
  projectId: string,
  slug: string,
  heading: string,
  body: string,
  body2: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  if (!(await canEditHero(projectId, session.user.id))) return { error: "Forbidden" };

  const trimmedHeading = heading.trim();
  const trimmedBody = body.trim();
  if (!trimmedHeading || !trimmedBody) return { error: "Heading and body are required" };

  const last = await prisma.projectHeroSlide.findFirst({ where: { projectId }, orderBy: { order: "desc" } });
  const slide = await prisma.projectHeroSlide.create({
    data: {
      projectId,
      heading: trimmedHeading,
      body: trimmedBody,
      body2: body2.trim() || null,
      order: (last?.order ?? -1) + 1,
    },
  });

  revalidatePath(`/projects/${slug}`);
  return { ok: true, slide };
}

export async function updateHeroSlide(slideId: string, slug: string, heading: string, body: string, body2: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const slide = await prisma.projectHeroSlide.findUnique({ where: { id: slideId } });
  if (!slide) return { error: "Not found" };
  if (!(await canEditHero(slide.projectId, session.user.id))) return { error: "Forbidden" };

  const trimmedHeading = heading.trim();
  const trimmedBody = body.trim();
  if (!trimmedHeading || !trimmedBody) return { error: "Heading and body are required" };

  const updated = await prisma.projectHeroSlide.update({
    where: { id: slideId },
    data: { heading: trimmedHeading, body: trimmedBody, body2: body2.trim() || null },
  });

  revalidatePath(`/projects/${slug}`);
  return { ok: true, slide: updated };
}

export async function deleteHeroSlide(slideId: string, slug: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const slide = await prisma.projectHeroSlide.findUnique({ where: { id: slideId } });
  if (!slide) return { error: "Not found" };
  if (!(await canEditHero(slide.projectId, session.user.id))) return { error: "Forbidden" };

  await prisma.projectHeroSlide.delete({ where: { id: slideId } });

  revalidatePath(`/projects/${slug}`);
  return { ok: true };
}
