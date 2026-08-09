"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";
import { deleteDocument, indexDocuments } from "@/lib/meili";
import { hideTarget, unhideTarget } from "@/lib/contentModeration";

export async function setProjectHidden(slug: string, hidden: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) return;

  if (hidden) {
    await hideTarget("Project", project.id, { hiddenById: session.user.id, hiddenReason: "ADMIN_ACTION" });
    await deleteDocument("projects", `project-${slug}`);
    await deleteDocument("projects", `project-${slug}__en`);
  } else {
    await unhideTarget("Project", project.id);
    await indexDocuments("projects", [{
      id: `project-${slug}`,
      type: "project",
      title: project.title,
      description: project.description ?? "",
      url: `/projects/${slug}`,
      phase: project.phase,
      sdgGoals: project.sdgGoals,
      locale: "sv",
    }]);
  }
  revalidatePath("/site-admin/projects");
  revalidatePath(`/projects/${slug}`);
}

export async function deleteProjectAsAdmin(slug: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);

  await prisma.project.delete({ where: { slug } });
  await deleteDocument("projects", `project-${slug}`);
  revalidatePath("/site-admin/projects");
}
