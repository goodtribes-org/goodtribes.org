"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notify";


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

export async function toggleEndorsement(ideaId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const existing = await prisma.ideaEndorsement.findUnique({
    where: { ideaId_userId: { ideaId, userId: session.user.id } },
  });

  if (existing) {
    await prisma.ideaEndorsement.delete({ where: { id: existing.id } });
  } else {
    await prisma.ideaEndorsement.create({ data: { ideaId, userId: session.user.id } });
    const idea = await prisma.idea.findUnique({ where: { id: ideaId }, select: { title: true, authorId: true } });
    if (idea && idea.authorId !== session.user.id) {
      const endorser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
      await createNotification({
        userId: idea.authorId,
        type: "idea_vote",
        title: `${endorser?.name ?? "Someone"} wants to contribute to your idea`,
        body: idea.title,
        url: `/ideas/${ideaId}`,
      });
    }
  }

  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ideas");
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

export async function setIdeaStatus(ideaId: string, newStatus: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { authorId: true, title: true },
  });
  if (!idea) return { error: "Not found" };

  const isAuthor = idea.authorId === session.user.id;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  const isModerator = user?.email?.endsWith("@goodtribes.org") ?? false;

  const authorAllowed = ["draft", "open"];
  if (!isModerator && (!isAuthor || !authorAllowed.includes(newStatus))) {
    return { error: "Not authorised" };
  }

  await prisma.idea.update({ where: { id: ideaId }, data: { status: newStatus } });

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

  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ideas");
}

export async function addComment(ideaId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  if (!content.trim()) return { error: "Comment is empty" };

  await prisma.ideaComment.create({
    data: { ideaId, authorId: session.user.id, content: content.trim() },
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
