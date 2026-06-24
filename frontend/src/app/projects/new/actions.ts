"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slugify";

const prisma = new PrismaClient();

export async function createProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const title = (formData.get("title") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const visibility = (formData.get("visibility") as string) || "public";
  const sdgGoals = formData
    .getAll("sdgGoals")
    .map(Number)
    .filter((n) => n >= 1 && n <= 17);

  if (!title) return;

  const baseSlug = slugify(title) || "project";
  let slug = "";

  for (let attempt = 0; attempt <= 9; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
    try {
      const project = await prisma.project.create({
        data: { slug: candidate, title, description, visibility, sdgGoals, ownerId: userId },
      });
      await prisma.projectMember.create({
        data: { projectId: project.id, userId, role: "owner" },
      });
      slug = project.slug;
      break;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === "P2002" && attempt < 9) continue;
      throw e;
    }
  }

  redirect(`/projects/${slug}`);
}
