"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slugify";
import { awardTokens, mintDirectGt, SANDBOX_GT_POOL, SANDBOX_LIFT_TRIBE_TOKEN_POOL } from "@/lib/tokens";
import { getSandboxRoomContributorWeights } from "@/lib/rooms";
import type { ProjectPhase } from "@prisma/client";

function stripHtml(body: string): string {
  return body.replace(/<[^>]*>/g, "").trim();
}

interface Contributor {
  userId: string;
  weight: number;
}

// PRD 4f: permissionless — any logged-in user may fork any project, or any
// Sandlådan Room (see Utvecklingsfas 1.2), without permission from the
// original. Mirrors createProject's copy shape (projects/new/actions.ts)
// plus WikiPage/ProjectSkill carryover and mandatory contributor
// compensation — never a shortcut around 4c's legal_type process (always
// NONPROFIT_UMBRELLA at creation, regardless of the source's legalType).
export async function forkProject(sourceType: "project" | "sandboxRoom", sourceId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  let title: string;
  let summary: string | null;
  let description: string | null;
  let category: string | null;
  let tags: string[];
  let sdgGoals: number[];
  let imageUrl: string | null;
  let phase: ProjectPhase;
  let originalProjectId: string | null = null;
  let sandboxThreadId: string | null = null;
  let wikiPagesToCopy: { slug: string; title: string; order: number; content: string }[] = [];
  let skillIdsToCopy: string[] = [];
  let contributors: Contributor[] = [];

  const titleOverride = (formData.get("title") as string | null)?.trim() || null;

  if (sourceType === "project") {
    const source = await prisma.project.findUnique({
      where: { slug: sourceId },
      include: { wikiPages: true, neededSkills: true },
    });
    if (!source) throw new Error("Project not found");

    originalProjectId = source.id;
    title = titleOverride || `${source.title} (fork)`;
    summary = source.summary;
    description = source.description;
    category = source.category;
    tags = source.tags;
    sdgGoals = source.sdgGoals;
    imageUrl = source.imageUrl;
    phase = source.phase;
    wikiPagesToCopy = source.wikiPages.map((w) => ({ slug: w.slug, title: w.title, order: w.order, content: w.content }));
    skillIdsToCopy = source.neededSkills.map((s) => s.skillId);

    const holderTotals = await prisma.tokenLedger.groupBy({
      by: ["userId"],
      where: { projectSlug: source.slug },
      _sum: { tokens: true },
    });
    contributors = holderTotals
      .map((h) => ({ userId: h.userId, weight: h._sum.tokens ?? 0 }))
      .filter((c) => c.weight > 0);
  } else {
    const room = await prisma.room.findUnique({ where: { id: sourceId } });
    if (!room || !room.isSandbox) throw new Error("Sandbox room not found");

    const openingMessage = await prisma.message.findFirst({
      where: { roomId: room.id },
      orderBy: { createdAt: "asc" },
    });

    sandboxThreadId = room.id;
    title = titleOverride || room.name || "Gafflad idé från Sandbox";
    summary = null;
    description = openingMessage ? stripHtml(openingMessage.body) : null;
    category = null;
    tags = [];
    sdgGoals = [];
    imageUrl = null;
    phase = "IDEA";

    contributors = await getSandboxRoomContributorWeights(room.id);
  }

  if (!title) return;

  const totalWeight = contributors.reduce((sum, c) => sum + c.weight, 0);
  const baseSlug = slugify(title) || "project";
  let slug = "";

  for (let attempt = 0; attempt <= 9; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
    try {
      await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            slug: candidate,
            title,
            summary,
            description,
            category,
            tags,
            sdgGoals,
            phase,
            visibility: "public",
            legalType: "NONPROFIT_UMBRELLA",
            ownerId: userId,
            ...(imageUrl ? { imageUrl } : {}),
            ...(originalProjectId ? { forkedFromProjectId: originalProjectId } : {}),
            ...(sandboxThreadId ? { forkedFromSandboxThreadId: sandboxThreadId } : {}),
          },
        });

        await tx.projectMember.create({ data: { projectId: project.id, userId, role: "FOUNDER" } });
        await tx.phaseTransition.create({
          data: { projectId: project.id, fromPhase: null, toPhase: project.phase, changedById: userId },
        });
        await tx.room.createMany({
          data: [
            { type: "PROJECT_CHANNEL", projectId: project.id, name: "allmänt", postingPolicy: "ALL_MEMBERS", order: 0 },
            { type: "PROJECT_CHANNEL", projectId: project.id, name: "beslut", postingPolicy: "LEADS_ONLY", order: 1 },
            { type: "PROJECT_CHANNEL", projectId: project.id, name: "ideer", postingPolicy: "ALL_MEMBERS", order: 2 },
          ],
        });

        if (wikiPagesToCopy.length > 0) {
          await tx.wikiPage.createMany({
            data: wikiPagesToCopy.map((w) => ({
              projectSlug: project.slug,
              slug: w.slug,
              title: w.title,
              order: w.order,
              content: w.content,
              createdById: userId,
            })),
          });
        }
        if (skillIdsToCopy.length > 0) {
          await tx.projectSkill.createMany({
            data: skillIdsToCopy.map((skillId) => ({ projectId: project.id, skillId })),
            skipDuplicates: true,
          });
        }

        for (const c of contributors) {
          await tx.forkContributorCredit.create({
            data: { forkedProjectId: project.id, originalProjectId, creditedUserId: c.userId },
          });
        }

        // Mandatory compensation floor — only meaningful for a project source,
        // since that's the only case with an existing Tribe Token stake to be
        // proportional to (PRD 4f).
        if (originalProjectId && totalWeight > 0) {
          for (const c of contributors) {
            await tx.forkProfitShare.create({
              data: {
                forkedProjectId: project.id,
                originalProjectId,
                originalContributorUserId: c.userId,
                sharePercent: (c.weight / totalWeight) * 100,
              },
            });
          }

          // Optional, forker-chosen top-up — real, newly minted Tribe Tokens.
          for (const c of contributors) {
            const grantRaw = formData.get(`grant_${c.userId}`) as string | null;
            const grantAmount = grantRaw ? parseFloat(grantRaw) : 0;
            if (grantAmount > 0) {
              await tx.forkTokenGrant.create({
                data: {
                  forkedProjectId: project.id,
                  originalProjectId,
                  originalContributorUserId: c.userId,
                  tribeTokensGranted: grantAmount,
                  grantedById: userId,
                },
              });
              await awardTokens(tx, {
                userId: c.userId,
                projectSlug: project.slug,
                tokens: grantAmount,
                reason: "Fork-tilldelning från gafflare",
              });
            }
          }
        }

        // Sandlådan (Utvecklingsfas 1.2): forking a sandbox thread has no
        // profit-share concept (no prior Tribe Token stake to be
        // proportional to), but its contributors still earn GT for the
        // sandbox activity itself plus fresh Tribe Tokens in the new project
        // — the same lift/fork token economy as createIdea/createProject
        // below, triggered here since a fork is itself a form of "outcome."
        if (sandboxThreadId && totalWeight > 0) {
          for (const c of contributors) {
            const share = c.weight / totalWeight;
            await mintDirectGt(tx, {
              userId: c.userId,
              tokens: SANDBOX_GT_POOL * share,
              reason: "Sandlåda: bidrag gafflat till projekt",
            });
            await awardTokens(tx, {
              userId: c.userId,
              projectSlug: project.slug,
              tokens: SANDBOX_LIFT_TRIBE_TOKEN_POOL * share,
              reason: "Sandlåda-bidrag vid fork",
            });
          }
        }

        slug = project.slug;
      });

      break;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === "P2002" && attempt < 9) continue;
      throw e;
    }
  }

  redirect(`/projects/${slug}`);
}
