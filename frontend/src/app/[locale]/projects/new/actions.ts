"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slugify";
import { indexDocuments } from "@/lib/meili";
import { suggestSdgGoals } from "@/lib/claude";
import { logOrgActivity } from "@/lib/activity";

export async function getSdgSuggestions(
  description: string
): Promise<{ goals: number[]; reasoning: string } | null> {
  return suggestSdgGoals(description);
}


export async function createProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const title = (formData.get("title") as string).trim();
  const summary = (formData.get("summary") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const visibility = (formData.get("visibility") as string) || "public";
  const category = (formData.get("category") as string | null)?.trim() || null;
  const tagsRaw = (formData.get("tags") as string | null)?.trim() || "";
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const sdgGoals = formData
    .getAll("sdgGoals")
    .map(Number)
    .filter((n) => n >= 1 && n <= 17);
  const imageUrl = (formData.get("imageUrl") as string | null)?.trim() || null;
  const orgId = (formData.get("orgId") as string | null)?.trim() || null;
  const ideaId = (formData.get("ideaId") as string | null)?.trim() || null;
  const fromThreadId = (formData.get("fromThread") as string | null)?.trim() || null;

  if (!title) return;

  const baseSlug = slugify(title) || "project";
  let slug = "";

  for (let attempt = 0; attempt <= 9; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
    try {
      const project = await prisma.project.create({
        data: { slug: candidate, title, summary, description, visibility, category, tags, sdgGoals, ownerId: userId, ...(imageUrl ? { imageUrl } : {}), ...(orgId ? { orgId } : {}) },
      });
      await prisma.projectMember.create({
        data: { projectId: project.id, userId, role: "FOUNDER" },
      });
      await prisma.phaseTransition.create({
        data: { projectId: project.id, fromPhase: null, toPhase: project.phase, changedById: userId },
      });
      await prisma.room.createMany({
        data: [
          { type: "PROJECT_CHANNEL", projectId: project.id, name: "allmänt", postingPolicy: "ALL_MEMBERS", order: 0 },
          { type: "PROJECT_CHANNEL", projectId: project.id, name: "beslut",  postingPolicy: "LEADS_ONLY",  order: 1 },
          { type: "PROJECT_CHANNEL", projectId: project.id, name: "ideer",   postingPolicy: "ALL_MEMBERS", order: 2 },
        ],
      });
      const skillIds = formData.getAll("skillIds") as string[];
      if (skillIds.length > 0) {
        await prisma.projectSkill.createMany({
          data: skillIds.map((skillId) => ({ projectId: project.id, skillId })),
          skipDuplicates: true,
        });
      }
      slug = project.slug;

      if (orgId) {
        await logOrgActivity(orgId, userId, "project_added", { title: project.title, slug: project.slug });
      }

      if (ideaId) {
        await prisma.idea.update({ where: { id: ideaId }, data: { status: "converted" } }).catch(() => {});
      }

      if (fromThreadId) {
        await prisma.room.update({ where: { id: fromThreadId }, data: { convertedToProjectId: project.id } }).catch(() => {});
      }

      await indexDocuments("projects", [
        {
          id: `project-${project.slug}`,
          type: "project",
          title: project.title,
          description: project.description ?? "",
          url: `/projects/${project.slug}`,
          phase: project.phase,
          sdgGoals: project.sdgGoals,
        },
      ]);
      break;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === "P2002" && attempt < 9) continue;
      throw e;
    }
  }

  redirect(`/projects/${slug}`);
}
