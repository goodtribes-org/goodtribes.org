"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { indexDocuments, deleteDocument } from "@/lib/meili";

const prisma = new PrismaClient();

export async function updateProject(slug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { slug },
    include: { members: { where: { userId: session.user.id } } },
  });
  if (!project) redirect("/projects");

  const role = project.members[0]?.role;
  if (!role || !["owner", "admin"].includes(role)) redirect(`/projects/${slug}`);

  const title = (formData.get("title") as string).trim();
  if (!title) return;

  const description = (formData.get("description") as string | null)?.trim() || null;
  const status = (formData.get("status") as string) || "concept";
  const visibility = (formData.get("visibility") as string) || "public";
  const category = (formData.get("category") as string | null)?.trim() || null;
  const tagsRaw = (formData.get("tags") as string | null)?.trim() || "";
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const sdgGoals = formData.getAll("sdgGoals").map(Number).filter((n) => n >= 1 && n <= 17);
  const imageUrl = (formData.get("imageUrl") as string | null)?.trim() || null;
  const orgId = (formData.get("orgId") as string | null)?.trim() || null;
  const skillIds = formData.getAll("skillIds") as string[];

  await prisma.project.update({
    where: { slug },
    data: { title, description, status, visibility, category, tags, sdgGoals, ...(imageUrl ? { imageUrl } : {}), orgId },
  });

  await prisma.$transaction([
    prisma.projectSkill.deleteMany({ where: { projectId: project.id } }),
    ...(skillIds.length > 0
      ? [prisma.projectSkill.createMany({
          data: skillIds.map((skillId) => ({ projectId: project.id, skillId })),
          skipDuplicates: true,
        })]
      : []),
  ]);

  // Sync Meilisearch — remove old slug entry if slug changed (slug doesn't change here, but keep in sync)
  if (visibility === "public") {
    await indexDocuments("projects", [{
      id: `project-${slug}`,
      type: "project",
      title,
      description: description ?? "",
      url: `/projects/${slug}`,
      status,
      sdgGoals,
    }]);
  } else {
    await deleteDocument("projects", `project-${slug}`);
  }

  revalidatePath(`/projects/${slug}`);
  redirect(`/projects/${slug}`);
}

export async function deleteProject(slug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { slug },
    include: { members: { where: { userId: session.user.id } } },
  });
  if (!project) redirect("/projects");
  if (project.members[0]?.role !== "owner") redirect(`/projects/${slug}`);

  await prisma.project.delete({ where: { slug } });
  await deleteDocument("projects", `project-${slug}`);

  redirect("/projects");
}
