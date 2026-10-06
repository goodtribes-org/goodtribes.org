import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProjectRole, isSiteAdmin } from "@/lib/authz";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { MAX_DRAFTS, type OwnDraft } from "@/lib/draftLimit";

export { MAX_DRAFTS, type OwnDraft };

// Drafts (#226). A project starts as a draft (publishedAt = NULL) that only
// its members and site admins can see, and becomes public when a lead
// publishes it. Every query that shows projects to people outside the
// project goes through PUBLIC_PROJECT_WHERE, so a draft can't leak into a
// list, search, feed, sitemap or profile because someone forgot a filter —
// src/__tests__/projectVisibility.test.ts checks the public surfaces use it.

// Visible to everyone: not hidden by a site admin, and published.
export const PUBLIC_PROJECT_WHERE = {
  hiddenAt: null,
  publishedAt: { not: null },
} satisfies Prisma.ProjectWhereInput;

export function isDraft(project: { publishedAt: Date | string | null }): boolean {
  return project.publishedAt === null;
}

// Who may open a draft: its real members (not followers) and site admins.
// Everyone else gets a 404, so even the draft's existence doesn't leak.
export async function canViewDraft(projectId: string, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const role = await getProjectRole(projectId, userId);
  if (role && role !== "FOLLOWER") return true;
  return isSiteAdmin(userId);
}

// The drafts someone owns (archived ones don't count against the limit).
export function ownDraftsWhere(userId: string): Prisma.ProjectWhereInput {
  return { ownerId: userId, publishedAt: null, archivedAt: null };
}

export async function countOwnDrafts(userId: string): Promise<number> {
  return prisma.project.count({ where: ownDraftsWhere(userId) });
}

export class DraftLimitError extends Error {
  constructor() {
    super(`Du har redan ${MAX_DRAFTS} utkast. Publicera eller ta bort ett innan du startar ett nytt projekt.`);
    this.name = "DraftLimitError";
  }
}

// What's still missing before a project can be published: a title and a
// short text about it. Not a phase gate — just enough that a visitor
// understands what it is.
export function publishMissing(project: { title: string; summary: string | null; description: string | null }): ("title" | "about")[] {
  const missing: ("title" | "about")[] = [];
  if (!project.title.trim()) missing.push("title");
  if (!project.summary?.trim() && !project.description?.trim()) missing.push("about");
  return missing;
}

// Unpublishing is only allowed while nobody else depends on the project
// being public: no other members, no funding campaign, no tokens paid to
// anyone but the founder and GoodTribes' AI user. After that, archive it.
export async function unpublishBlockers(project: { id: string; slug: string; ownerId: string }): Promise<("members" | "funding" | "tokens")[]> {
  const ai = await getAiParticipantUser().catch(() => null);
  const insiders = [project.ownerId, ...(ai ? [ai.id] : [])];
  const [otherMembers, campaign, otherTokens] = await Promise.all([
    prisma.projectMember.count({ where: { projectId: project.id, userId: { notIn: insiders }, role: { not: "FOLLOWER" } } }),
    prisma.fundingCampaign.count({ where: { projectId: project.id } }),
    prisma.tokenLedger.count({ where: { projectSlug: project.slug, userId: { notIn: insiders } } }),
  ]);
  const blockers: ("members" | "funding" | "tokens")[] = [];
  if (otherMembers > 0) blockers.push("members");
  if (campaign > 0) blockers.push("funding");
  if (otherTokens > 0) blockers.push("tokens");
  return blockers;
}

export async function listOwnDrafts(userId: string): Promise<OwnDraft[]> {
  return prisma.project.findMany({
    where: ownDraftsWhere(userId),
    orderBy: { updatedAt: "desc" },
    select: { slug: true, title: true },
  });
}
