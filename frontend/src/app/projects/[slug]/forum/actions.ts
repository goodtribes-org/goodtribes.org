"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";


export async function createForumPost(formData: FormData, slug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const body = (formData.get("body") as string | null)?.trim() ?? "";
  const category = (formData.get("category") as string | null)?.trim() || "general";

  if (!title || !body) return;
  if (title.length > 200) return;

  const post = await prisma.forumPost.create({
    data: {
      projectSlug: slug,
      authorId: session.user.id,
      title,
      body,
      category,
    },
  });

  revalidatePath(`/projects/${slug}/forum`);
  redirect(`/projects/${slug}/forum/${post.id}`);
}

export async function createForumReply(
  formData: FormData,
  postId: string,
  projectSlug: string,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const body = (formData.get("body") as string | null)?.trim() ?? "";
  if (!body) return;

  await prisma.forumReply.create({
    data: {
      postId,
      authorId: session.user.id,
      body,
    },
  });

  revalidatePath(`/projects/${projectSlug}/forum/${postId}`);
}

export async function togglePostReaction(postId: string, slug: string, emoji: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const existing = await prisma.forumPostReaction.findUnique({
    where: { postId_userId_emoji: { postId, userId: session.user.id, emoji } },
  });
  if (existing) {
    await prisma.forumPostReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.forumPostReaction.create({
      data: { postId, userId: session.user.id, emoji },
    });
  }
  revalidatePath(`/projects/${slug}/forum/${postId}`);
}

export async function toggleReplyReaction(replyId: string, postId: string, slug: string, emoji: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const existing = await prisma.forumReplyReaction.findUnique({
    where: { replyId_userId_emoji: { replyId, userId: session.user.id, emoji } },
  });
  if (existing) {
    await prisma.forumReplyReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.forumReplyReaction.create({
      data: { replyId, userId: session.user.id, emoji },
    });
  }
  revalidatePath(`/projects/${slug}/forum/${postId}`);
}

export async function updateForumPostStatus(
  postId: string,
  status: string,
  projectSlug: string,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    include: { members: { where: { userId: session.user.id } } },
  });
  if (!project) return { error: "Project not found" };

  const role = project.members[0]?.role;
  const isOwnerOrAdmin = role && ["owner", "admin"].includes(role);
  const isProjectOwner = project.ownerId === session.user.id;

  if (!isOwnerOrAdmin && !isProjectOwner) return { error: "Not authorized" };

  await prisma.forumPost.update({
    where: { id: postId },
    data: { status },
  });

  revalidatePath(`/projects/${projectSlug}/forum`);
  revalidatePath(`/projects/${projectSlug}/forum/${postId}`);
}
