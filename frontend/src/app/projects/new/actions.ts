"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slugify";
import { indexDocuments } from "@/lib/meili";
import { suggestSdgGoals } from "@/lib/claude";

export async function getSdgSuggestions(
  description: string
): Promise<{ goals: number[]; reasoning: string } | null> {
  return suggestSdgGoals(description);
}

const prisma = new PrismaClient();

export async function createProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const title = (formData.get("title") as string).trim();
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

  if (!title) return;

  const baseSlug = slugify(title) || "project";
  let slug = "";

  for (let attempt = 0; attempt <= 9; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
    try {
      const project = await prisma.project.create({
        data: { slug: candidate, title, description, visibility, category, tags, sdgGoals, ownerId: userId, ...(imageUrl ? { imageUrl } : {}) },
      });
      await prisma.projectMember.create({
        data: { projectId: project.id, userId, role: "owner" },
      });
      slug = project.slug;
      await indexDocuments("projects", [
        {
          id: `project-${project.slug}`,
          type: "project",
          title: project.title,
          description: project.description ?? "",
          url: `/projects/${project.slug}`,
          status: project.status,
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
