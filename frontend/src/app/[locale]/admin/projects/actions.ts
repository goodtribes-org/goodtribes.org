"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";
import { deleteDocument } from "@/lib/meili";

export async function setProjectVisibility(slug: string, visibility: "public" | "private") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);

  await prisma.project.update({ where: { slug }, data: { visibility } });
  if (visibility === "private") await deleteDocument("projects", `project-${slug}`);
  revalidatePath("/admin/projects");
}

export async function deleteProjectAsAdmin(slug: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);

  await prisma.project.delete({ where: { slug } });
  await deleteDocument("projects", `project-${slug}`);
  revalidatePath("/admin/projects");
}
