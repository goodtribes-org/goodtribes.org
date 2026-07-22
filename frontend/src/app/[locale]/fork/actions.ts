"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slugify";
import { awardTokens } from "@/lib/tokens";

interface Contributor {
  userId: string;
  weight: number;
}

// PRD 4f: permissionless — any logged-in user may fork any project (sandbox
// or not — a sandbox project is a real project, so this already covers it),
// without permission from the original. Mirrors createProjectRecord's copy
// shape plus WikiPage/ProjectSkill carryover and mandatory contributor
// compensation — never a shortcut around 4c's legal_type process (always
// NONPROFIT_UMBRELLA at creation, regardless of the source's legalType).
export async function forkProject(sourceSlug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const source = await prisma.project.findUnique({
    where: { slug: sourceSlug },
    include: { wikiPages: true, neededSkills: true },
  });
  if (!source) throw new Error("Project not found");

  const titleOverride = (formData.get("title") as string | null)?.trim() || null;
  const title = titleOverride || `${source.title} (fork)`;
  const wikiPagesToCopy = source.wikiPages.map((w) => ({ slug: w.slug, title: w.title, order: w.order, content: w.content }));
  const skillIdsToCopy = source.neededSkills.map((s) => s.skillId);

  const holderTotals = await prisma.tokenLedger.groupBy({
    by: ["userId"],
    where: { projectSlug: source.slug },
    _sum: { tokens: true },
  });
  const contributors: Contributor[] = holderTotals
    .map((h) => ({ userId: h.userId, weight: h._sum.tokens ?? 0 }))
    .filter((c) => c.weight > 0);

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
            summary: source.summary,
            description: source.description,
            category: source.category,
            tags: source.tags,
            sdgGoals: source.sdgGoals,
            phase: source.phase,
            visibility: "public",
            legalType: "NONPROFIT_UMBRELLA",
            ownerId: userId,
            forkedFromProjectId: source.id,
            ...(source.imageUrl ? { imageUrl: source.imageUrl } : {}),
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
            data: { forkedProjectId: project.id, originalProjectId: source.id, creditedUserId: c.userId },
          });
        }

        // Mandatory compensation floor, proportional to prior Tribe Token stake (PRD 4f).
        if (totalWeight > 0) {
          for (const c of contributors) {
            await tx.forkProfitShare.create({
              data: {
                forkedProjectId: project.id,
                originalProjectId: source.id,
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
                  originalProjectId: source.id,
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
