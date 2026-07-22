"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slugify";
import { indexDocuments } from "@/lib/meili";
import { suggestSdgGoals } from "@/lib/claude";
import { logOrgActivity } from "@/lib/activity";
import { isValidLegalType } from "@/lib/legalType";
import { awardTokens, mintDirectGt, SANDBOX_GT_POOL, SANDBOX_LIFT_TRIBE_TOKEN_POOL } from "@/lib/tokens";
import { getSandboxRoomContributorWeights } from "@/lib/rooms";

// Sandlådan (Utvecklingsfas 1.2): mints GT + fresh Tribe Tokens in the new
// project for a sandbox room's contributors, proportional to their message
// share — the full lift token economy (see also fork/actions.ts's fork
// path and ideas/new/actions.ts's GT-only lift-to-Idéflödet step).
async function mintSandboxLiftTokens(roomId: string, projectSlug: string, opts?: { skipGt?: boolean }) {
  const contributors = await getSandboxRoomContributorWeights(roomId);
  const totalWeight = contributors.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const c of contributors) {
      const share = c.weight / totalWeight;
      if (!opts?.skipGt) {
        await mintDirectGt(tx, {
          userId: c.userId,
          tokens: SANDBOX_GT_POOL * share,
          reason: "Sandlåda: bidrag lyft till projekt",
        });
      }
      await awardTokens(tx, {
        userId: c.userId,
        projectSlug,
        tokens: SANDBOX_LIFT_TRIBE_TOKEN_POOL * share,
        reason: "Sandlåda-bidrag vid lyft",
      });
    }
  });
}

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
  const legalTypeRaw = (formData.get("legalType") as string | null)?.trim() || "";
  const legalType = isValidLegalType(legalTypeRaw) ? legalTypeRaw : "NONPROFIT_UMBRELLA";

  if (!title) throw new Error("Projektnamn krävs.");

  const baseSlug = slugify(title) || "project";
  let slug = "";

  for (let attempt = 0; attempt <= 9; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
    try {
      const project = await prisma.project.create({
        data: { slug: candidate, title, summary, description, visibility, category, tags, sdgGoals, legalType, ownerId: userId, ...(imageUrl ? { imageUrl } : {}), ...(orgId ? { orgId } : {}) },
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

        // Sandlådan: if this Idea originated from a sandbox thread, GT was
        // already given when it was lifted to the Idéflödet (see
        // ideas/new/actions.ts) — only the fresh Tribe Tokens are still due.
        const originRoom = await prisma.room.findFirst({ where: { convertedToIdeaId: ideaId, isSandbox: true } });
        if (originRoom) {
          await mintSandboxLiftTokens(originRoom.id, project.slug, { skipGt: true });
        }
      }

      if (fromThreadId) {
        const room = await prisma.room
          .update({ where: { id: fromThreadId }, data: { convertedToProjectId: project.id } })
          .catch(() => null);

        if (room?.isSandbox) {
          await mintSandboxLiftTokens(fromThreadId, project.slug);
        }
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

  redirect(`/projects/${slug}/guide`);
}
