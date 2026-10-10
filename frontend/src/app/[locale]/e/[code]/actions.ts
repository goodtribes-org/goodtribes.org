"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { parseFirstTaskFields } from "@/lib/firstTasks";
import { logEventAction } from "@/lib/events";
import { toDisplayPhase, type ProjectPhaseValue } from "@/lib/projectPhase";
import { publishProject } from "@/app/[locale]/projects/[slug]/publish-actions";

// Step 2 of an evening (#281): open one first task in your dream, straight
// from the evening's page. The dream is published at the same time — a task
// in a draft can't be found by anyone else in the room. The form says so.
export async function openEventFirstTask(projectId: string, title: unknown, raw: unknown): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "not_logged_in" };
  const name = typeof title === "string" ? title.trim().slice(0, 200) : "";
  if (!name) return { error: "missing_title" };
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, slug: true, phase: true, publishedAt: true } });
  if (!project || !(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES))) return { error: "not_allowed" };

  if (!project.publishedAt) {
    const published = await publishProject(project.slug);
    if ("error" in published) return { error: "publish_failed" };
  }
  const f = parseFirstTaskFields(raw);
  const card = await prisma.kanbanCard.create({
    data: {
      projectSlug: project.slug,
      title: name,
      column: "TODO",
      createdById: userId,
      phase: toDisplayPhase(project.phase as ProjectPhaseValue),
      openToPublic: true,
      firstTaskWhy: f.why,
      firstTaskTime: f.time,
      firstTaskPlace: f.place,
      firstTaskChoose: f.choose,
      firstTaskQuestion: f.question,
      firstTaskMaxOffers: f.maxOffers,
    },
    select: { id: true },
  });
  await logEventAction("FIRST_TASK", userId, { cardId: card.id, projectId: project.id });
  revalidatePath(`/projects/${project.slug}`);
  return { ok: true };
}
