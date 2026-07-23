"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { suggestSdgGoals } from "@/lib/claude";
import { logOrgActivity } from "@/lib/activity";
import { createProjectRecord } from "@/lib/createProject";
import { linkPromotedProject } from "@/lib/promoteIdea";

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
  if (!title) throw new Error("Projektnamn krävs.");

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
  const legalTypeRaw = (formData.get("legalType") as string | null)?.trim() || "";
  const skillIds = formData.getAll("skillIds") as string[];

  const project = await createProjectRecord({
    title, summary, description, visibility, category, tags, sdgGoals, imageUrl, orgId,
    legalType: legalTypeRaw, ownerId: userId, skillIds,
  });

  if (orgId) {
    await logOrgActivity(orgId, userId, "project_added", { title: project.title, slug: project.slug });
  }

  if (ideaId) {
    await linkPromotedProject(ideaId, project.id, userId);
  }

  if (fromThreadId) {
    await prisma.room
      .update({ where: { id: fromThreadId }, data: { convertedToProjectId: project.id } })
      .catch(() => null);
  }

  redirect(`/projects/${project.slug}/guide`);
}
