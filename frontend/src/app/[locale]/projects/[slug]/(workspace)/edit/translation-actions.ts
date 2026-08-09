"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { indexDocuments } from "@/lib/meili";
import { requireProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { routing } from "@/i18n/routing";

// Saves (or updates) a non-default-locale translation for a project's
// title/summary/description. The base sv columns on Project are never
// touched here — same permission level as updateProject (project lead,
// site-admin bypass via requireProjectRole's default). No UI calls this yet;
// it's the plumbing an AI-draft-then-approve flow will call into.
export async function upsertProjectTranslation(
  projectId: string,
  locale: string,
  data: { title: string; summary: string | null; description: string | null }
): Promise<{ error: string } | { ok: true }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  if (locale === routing.defaultLocale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return { error: "Invalid locale" };
  }

  const title = data.title.trim();
  if (!title) return { error: "Title is required" };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Not found" };

  try {
    await requireProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES);
  } catch {
    return { error: "Not authorised" };
  }

  await prisma.projectTranslation.upsert({
    where: { projectId_locale: { projectId, locale } },
    create: {
      projectId,
      locale,
      title,
      summary: data.summary?.trim() || null,
      description: data.description?.trim() || null,
    },
    update: {
      title,
      summary: data.summary?.trim() || null,
      description: data.description?.trim() || null,
    },
  });

  if (locale === "en" && !project.hiddenAt) {
    await indexDocuments("projects", [{
      id: `project-${project.slug}__en`,
      type: "project",
      title,
      description: data.description?.trim() || "",
      url: `/projects/${project.slug}`,
      phase: project.phase,
      sdgGoals: project.sdgGoals,
      locale: "en",
    }]);
  }

  revalidatePath(`/projects/${project.slug}`);
  revalidatePath(`/projects/${project.slug}/edit`);
  return { ok: true };
}
