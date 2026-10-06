"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import type { IdeaHelpRole, IdeaStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notify";
import { isSiteAdmin } from "@/lib/authz";
import { guardSocialAction } from "@/lib/socialActionGuard";
import { runProactiveModeration } from "@/lib/proactiveModeration";
import { indexDocuments, deleteDocument } from "@/lib/meili";
import { routing } from "@/i18n/routing";
import { IDEAS_LIST_TAG, invalidateListCache } from "@/lib/listCache";

// The only statuses since #233, same as IdeaInteractions.tsx's dropdown --
// kept as a runtime whitelist here too since a Server Action's arguments
// are just as reachable as any other input a client can send.
const IDEA_STATUS_VALUES: readonly IdeaStatus[] = ["draft", "open"];


export async function toggleVote(ideaId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const existing = await prisma.ideaVote.findUnique({
    where: { ideaId_userId: { ideaId, userId: session.user.id } },
  });

  if (existing) {
    await prisma.ideaVote.delete({ where: { id: existing.id } });
  } else {
    await prisma.ideaVote.create({ data: { ideaId, userId: session.user.id } });
    const idea = await prisma.idea.findUnique({ where: { id: ideaId }, select: { title: true, authorId: true } });
    if (idea && idea.authorId !== session.user.id) {
      const voter = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
      await createNotification({
        userId: idea.authorId,
        type: "idea_vote",
        title: `${voter?.name ?? "Someone"} voted on your idea`,
        body: idea.title,
        url: `/ideas/${ideaId}`,
      });
    }
  }

  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ideas");
  revalidatePath("/");
}

const HELP_ROLES: readonly IdeaHelpRole[] = ["CODE", "DESIGN", "COMMUNICATION", "FUNDRAISING", "CONTACTS", "LOCAL_KNOWLEDGE", "PRACTICAL"];

// "Jag vill hjälpa till" (#235): say what you could help with, change it,
// or (roles = null) stop. Replaces the old "Stötta" toggle; the row is the
// same IdeaEndorsement. Roles come from the client, so they are filtered
// against the enum rather than trusted.
export async function setIdeaHelp(ideaId: string, roles: string[] | null) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const userId = session.user.id;
  const where = { ideaId_userId: { ideaId, userId } };

  if (roles === null) {
    await prisma.ideaEndorsement.deleteMany({ where: { ideaId, userId } });
  } else {
    const picked = HELP_ROLES.filter((r) => roles.includes(r));
    const idea = await prisma.idea.findFirst({ where: { id: ideaId, hiddenAt: null }, select: { title: true, authorId: true } });
    if (!idea) return { error: "Not found" };
    const existing = await prisma.ideaEndorsement.findUnique({ where, select: { id: true } });
    await prisma.ideaEndorsement.upsert({ where, create: { ideaId, userId, roles: picked }, update: { roles: picked } });
    if (!existing && idea.authorId !== userId) {
      const helper = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      await createNotification({
        userId: idea.authorId,
        type: "idea_vote",
        title: `${helper?.name ?? "Någon"} vill hjälpa till med din idé`,
        body: idea.title,
        url: `/ideas/${ideaId}#hjalp`,
      });
    }
  }

  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ideas");
  return { ok: true };
}

export async function toggleFollow(ideaId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const existing = await prisma.ideaFollower.findUnique({
    where: { ideaId_userId: { ideaId, userId: session.user.id } },
  });

  if (existing) {
    await prisma.ideaFollower.delete({ where: { id: existing.id } });
  } else {
    await prisma.ideaFollower.create({ data: { ideaId, userId: session.user.id } });
  }

  revalidatePath(`/ideas/${ideaId}`);
}

export async function setIdeaStatus(ideaId: string, newStatusRaw: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  if (!IDEA_STATUS_VALUES.includes(newStatusRaw as IdeaStatus)) {
    return { error: "Invalid status" };
  }
  const newStatus = newStatusRaw as IdeaStatus;

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { authorId: true, title: true, problem: true, description: true, hiddenAt: true },
  });
  if (!idea) return { error: "Not found" };

  // #233: no approval step. The author moves their idea between draft and
  // open; moderation goes through ContentFlag, not a status.
  const authorAllowed: readonly IdeaStatus[] = ["draft", "open"];
  if (idea.authorId !== session.user.id || !authorAllowed.includes(newStatus)) {
    return { error: "Not authorised" };
  }

  await prisma.idea.update({ where: { id: ideaId }, data: { status: newStatus } });

  // Keep the search index in sync with the same "drafts aren't searchable"
  // rule createIdea applies at creation time — without this, an idea's
  // Meilisearch doc only ever reflected whatever status it had the moment
  // it was first created, never later transitions (draft -> open, or a
  // moderator reverting something back to draft).
  if (newStatus === "draft" || idea.hiddenAt) {
    void deleteDocument("ideas", `idea-${ideaId}`);
  } else {
    void indexDocuments("ideas", [{
      id: `idea-${ideaId}`,
      type: "idea",
      title: idea.title,
      description: idea.problem ?? idea.description ?? "",
      url: `/ideas/${ideaId}`,
      locale: "sv",
    }]);
  }

  // Notify followers when status changes to shortlisted/approved
  if (["shortlisted", "approved"].includes(newStatus)) {
    const followers = await prisma.ideaFollower.findMany({
      where: { ideaId },
      select: { userId: true },
    });
    await Promise.all(
      followers.filter(f => f.userId !== session.user!.id).map(f =>
        createNotification({
          userId: f.userId,
          type: "idea_vote",
          title: `An idea you follow was ${newStatus}`,
          body: idea.title,
          url: `/ideas/${ideaId}`,
        }).catch(() => {})
      )
    );
  }

  invalidateListCache(IDEAS_LIST_TAG);
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ideas");
}

export async function addComment(ideaId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const trimmed = content.trim();
  if (!trimmed) return { error: "Comment is empty" };

  const guard = await guardSocialAction(session.user.id, "comment");
  if (!guard.ok) return { error: guard.error, code: guard.code };

  const comment = await prisma.ideaComment.create({
    data: { ideaId, authorId: session.user.id, content: trimmed },
  });

  await runProactiveModeration({
    targetType: "IdeaComment",
    targetId: comment.id,
    authorId: session.user.id,
    text: trimmed,
    url: `/ideas/${ideaId}`,
  });

  const idea = await prisma.idea.findUnique({ where: { id: ideaId }, select: { title: true, authorId: true } });
  if (idea && idea.authorId !== session.user.id) {
    const commenter = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
    await createNotification({
      userId: idea.authorId,
      type: "idea_comment",
      title: `${commenter?.name ?? "Someone"} commented on your idea`,
      body: idea.title,
      url: `/ideas/${ideaId}`,
    });
  }

  revalidatePath(`/ideas/${ideaId}`);
}

export async function proposeRevision(ideaId: string, proposedDescription: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const trimmed = proposedDescription.trim();
  if (!trimmed) return { error: "Description is empty" };

  const idea = await prisma.idea.findUnique({ where: { id: ideaId }, select: { title: true, description: true, authorId: true } });
  if (!idea) return { error: "Not found" };

  await prisma.ideaRevision.create({
    data: {
      ideaId,
      proposedById: session.user.id,
      proposedDescription: trimmed,
      previousDescription: idea.description,
    },
  });

  if (idea.authorId !== session.user.id) {
    const proposer = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
    await createNotification({
      userId: idea.authorId,
      type: "idea_revision_proposed",
      title: `${proposer?.name ?? "Someone"} proposed an edit to your idea`,
      body: idea.title,
      url: `/ideas/${ideaId}`,
    }).catch(() => {});
  }

  revalidatePath(`/ideas/${ideaId}`);
}

export async function decideRevision(revisionId: string, decision: "accept" | "reject", decisionNote?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const revision = await prisma.ideaRevision.findUnique({
    where: { id: revisionId },
    include: { idea: { select: { id: true, authorId: true, title: true, status: true, problem: true, hiddenAt: true } } },
  });
  if (!revision) return { error: "Not found" };
  if (revision.status !== "pending") return { error: "Already decided" };

  const isAuthor = revision.idea.authorId === session.user.id;
  if (!isAuthor && !(await isSiteAdmin(session.user.id))) return { error: "Not authorised" };

  const decidedById = session.user.id;
  const decidedAt = new Date();
  const note = decisionNote?.trim() || null;

  if (decision === "accept") {
    await prisma.$transaction([
      prisma.idea.update({ where: { id: revision.idea.id }, data: { description: revision.proposedDescription } }),
      prisma.ideaRevision.update({
        where: { id: revisionId },
        data: { status: "accepted", decidedById, decidedAt, decisionNote: note },
      }),
      prisma.ideaContributor.upsert({
        where: { ideaId_userId: { ideaId: revision.idea.id, userId: revision.proposedById } },
        create: { ideaId: revision.idea.id, userId: revision.proposedById, role: "co-author" },
        update: {},
      }),
    ]);

    // The accepted revision changes Idea.description, which the search doc
    // also carries (as a problem/description fallback, same as createIdea)
    // — without this, an idea's searchable text goes stale after every
    // accepted co-creation edit until the next full /api/meili-sync resync.
    if (revision.idea.status !== "draft" && !revision.idea.hiddenAt) {
      void indexDocuments("ideas", [{
        id: `idea-${revision.idea.id}`,
        type: "idea",
        title: revision.idea.title,
        description: revision.idea.problem ?? revision.proposedDescription ?? "",
        url: `/ideas/${revision.idea.id}`,
        locale: "sv",
      }]);
    }
    invalidateListCache(IDEAS_LIST_TAG);
  } else {
    await prisma.ideaRevision.update({
      where: { id: revisionId },
      data: { status: "rejected", decidedById, decidedAt, decisionNote: note },
    });
  }

  if (revision.proposedById !== decidedById) {
    await createNotification({
      userId: revision.proposedById,
      type: "idea_revision_decided",
      title: decision === "accept" ? "Your proposed edit was accepted" : "Your proposed edit was rejected",
      body: revision.idea.title,
      url: `/ideas/${revision.idea.id}`,
    }).catch(() => {});
  }

  revalidatePath(`/ideas/${revision.idea.id}`);
}

// Saves (or updates) a non-default-locale translation for an idea's
// title/description/problem/solution. The base sv columns on Idea are never
// touched here — same permission level as decideRevision (author or
// site-admin). No UI calls this yet; it's the plumbing an AI-draft-then-
// approve flow will call into.
export async function upsertIdeaTranslation(
  ideaId: string,
  locale: string,
  data: { title: string; description: string | null; problem: string | null; solution: string | null }
): Promise<{ error: string } | { ok: true }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  if (locale === routing.defaultLocale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return { error: "Invalid locale" };
  }

  const title = data.title.trim();
  if (!title) return { error: "Title is required" };

  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) return { error: "Not found" };

  const isAuthor = idea.authorId === session.user.id;
  if (!isAuthor && !(await isSiteAdmin(session.user.id))) return { error: "Not authorised" };

  await prisma.ideaTranslation.upsert({
    where: { ideaId_locale: { ideaId, locale } },
    create: {
      ideaId,
      locale,
      title,
      description: data.description?.trim() || null,
      problem: data.problem?.trim() || null,
      solution: data.solution?.trim() || null,
    },
    update: {
      title,
      description: data.description?.trim() || null,
      problem: data.problem?.trim() || null,
      solution: data.solution?.trim() || null,
    },
  });

  if (locale === "en" && !idea.hiddenAt && idea.status !== "draft") {
    void indexDocuments("ideas", [{
      id: `idea-${idea.id}__en`,
      type: "idea",
      title,
      description: data.problem?.trim() || data.description?.trim() || "",
      url: `/ideas/${idea.id}`,
      locale: "en",
    }]);
  }

  revalidatePath(`/ideas/${ideaId}`);
  return { ok: true };
}



// "Vad talar för och emot?" (#236). Short, one argument at a time; same
// guard and proactive moderation as comments, and flaggable the same way.
// Also IdeaArguments.tsx's maxLength; a "use server" file can only export
// async functions, so the client keeps its own copy.
const MAX_ARGUMENT_LENGTH = 500;

export async function addIdeaArgument(ideaId: string, side: string, text: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  if (side !== "PRO" && side !== "CON") return { error: "Invalid side" };
  const trimmed = text.trim();
  if (!trimmed) return { error: "Empty" };
  if (trimmed.length > MAX_ARGUMENT_LENGTH) return { error: "Too long" };
  const idea = await prisma.idea.findFirst({ where: { id: ideaId, hiddenAt: null, status: "open" }, select: { id: true } });
  if (!idea) return { error: "Not found" };

  const guard = await guardSocialAction(session.user.id, "comment");
  if (!guard.ok) return { error: guard.error, code: guard.code };

  const argument = await prisma.ideaArgument.create({
    data: { ideaId, authorId: session.user.id, side, text: trimmed },
  });
  await runProactiveModeration({
    targetType: "IdeaArgument",
    targetId: argument.id,
    authorId: session.user.id,
    text: trimmed,
    url: `/ideas/${ideaId}`,
  });
  revalidatePath(`/ideas/${ideaId}`);
  return { ok: true };
}

export async function toggleArgumentHelpful(argumentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const argument = await prisma.ideaArgument.findFirst({ where: { id: argumentId, hiddenAt: null }, select: { ideaId: true, authorId: true } });
  if (!argument) return { error: "Not found" };
  // Your own argument isn't yours to mark helpful.
  if (argument.authorId === session.user.id) return { error: "Own argument" };
  const where = { argumentId_userId: { argumentId, userId: session.user.id } };
  const existing = await prisma.ideaArgumentHelpful.findUnique({ where, select: { id: true } });
  if (existing) await prisma.ideaArgumentHelpful.delete({ where: { id: existing.id } });
  else await prisma.ideaArgumentHelpful.create({ data: { argumentId, userId: session.user.id } });
  revalidatePath(`/ideas/${argument.ideaId}`);
  return { ok: true };
}

export async function deleteOwnArgument(argumentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const argument = await prisma.ideaArgument.findUnique({ where: { id: argumentId }, select: { ideaId: true, authorId: true } });
  if (!argument || argument.authorId !== session.user.id) return { error: "Not authorised" };
  await prisma.ideaArgument.delete({ where: { id: argumentId } });
  revalidatePath(`/ideas/${argument.ideaId}`);
  return { ok: true };
}
