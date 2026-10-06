"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasProjectRole, isSiteAdmin, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { deleteDocument, indexDocuments } from "@/lib/meili";
import { PROJECTS_LIST_TAG, invalidateListCache } from "@/lib/listCache";
import { publishMissing, unpublishBlockers } from "@/lib/projectVisibility";
import { logOrgActivity } from "@/lib/activity";

type PublishResult =
  | { ok: true }
  | { error: "not_allowed" }
  | { error: "missing"; missing: ("title" | "about")[] }
  | { error: "blocked"; blockers: ("members" | "funding" | "tokens")[] };

async function leadProject(slug: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, title: true, summary: true, description: true, phase: true, sdgGoals: true, ownerId: true, orgId: true, hiddenAt: true, publishedAt: true,
      translations: { where: { locale: "en" }, select: { title: true, description: true } },
    },
  });
  if (!project) return null;
  // Site admins get a founder's controls here too (requireProjectRole's
  // allowSiteAdmin precedent).
  if (!(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES)) && !(await isSiteAdmin(userId))) return null;
  return project;
}

function revalidate(slug: string) {
  invalidateListCache(PROJECTS_LIST_TAG);
  revalidatePath(`/projects/${slug}`, "layout");
  revalidatePath("/");
}

// A lead makes a draft public (#226): it shows up in lists, search, the
// feed and the sitemap from now on.
export async function publishProject(slug: string): Promise<PublishResult> {
  const project = await leadProject(slug);
  if (!project) return { error: "not_allowed" };
  if (project.publishedAt) return { ok: true };
  const missing = publishMissing(project);
  if (missing.length) return { error: "missing", missing };

  await prisma.project.update({ where: { id: project.id }, data: { publishedAt: new Date() } });
  // The organisation's activity log hears about it now, not at the draft.
  if (project.orgId) await logOrgActivity(project.orgId, project.ownerId, "project_added", { title: project.title, slug: project.slug });
  if (!project.hiddenAt) {
    void indexDocuments("projects", [{
      id: `project-${project.slug}`,
      type: "project",
      title: project.title,
      description: project.description ?? "",
      url: `/projects/${project.slug}`,
      phase: project.phase,
      sdgGoals: project.sdgGoals,
      locale: "sv",
    }, ...project.translations.map((tr) => ({
      id: `project-${project.slug}__en`,
      type: "project",
      title: tr.title,
      description: tr.description ?? "",
      url: `/projects/${project.slug}`,
      phase: project.phase,
      sdgGoals: project.sdgGoals,
      locale: "en",
    }))]);
  }
  revalidate(slug);
  return { ok: true };
}

// Back to a draft — only while nobody else depends on the project being
// public (unpublishBlockers). After that, archiving is the way out.
export async function unpublishProject(slug: string): Promise<PublishResult> {
  const project = await leadProject(slug);
  if (!project) return { error: "not_allowed" };
  if (!project.publishedAt) return { ok: true };
  const blockers = await unpublishBlockers(project);
  if (blockers.length) return { error: "blocked", blockers };

  await prisma.project.update({ where: { id: project.id }, data: { publishedAt: null } });
  void deleteDocument("projects", `project-${project.slug}`);
  void deleteDocument("projects", `project-${project.slug}__en`);
  revalidate(slug);
  return { ok: true };
}
