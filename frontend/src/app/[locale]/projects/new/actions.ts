"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { suggestSdgGoals } from "@/lib/claude";
import { logOrgActivity } from "@/lib/activity";
import { createProjectRecord } from "@/lib/createProject";
import { linkPromotedProject } from "@/lib/promoteIdea";
import { parseProjectInput } from "@/lib/github";
import { syncProjectBoardInBackground } from "@/lib/githubSync";
import { markChecklistDone } from "../[slug]/guide/actions";

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

  const slogan = (formData.get("slogan") as string | null)?.trim() || null;
  const summary = (formData.get("summary") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
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
    title, slogan, summary, description, category, tags, sdgGoals, imageUrl, orgId,
    legalType: legalTypeRaw, ownerId: userId, skillIds,
  });

  // This form already covers everything the guide's "Beskriv projektet"
  // step (dream_defined) asks for, so mark it done immediately — the guide
  // that follows starts one step further in (AI review).
  await markChecklistDone(project.id, "dream_defined", userId);

  // Map the GitHub project board, if one was given. An unparseable value is
  // ignored rather than blocking project creation — it can be fixed under /edit.
  const githubRef = parseProjectInput(formData.get("githubProject") as string | null);
  if (githubRef) {
    const boardRow = await prisma.projectGithubBoard
      .create({
        data: {
          projectSlug: project.slug,
          ownerLogin: githubRef.ownerLogin,
          ownerType: githubRef.ownerType,
          projectNumber: githubRef.projectNumber,
        },
      })
      .catch(() => null);
    // Populate the board now instead of waiting for the next cron tick.
    if (boardRow) syncProjectBoardInBackground(boardRow);
  }

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
