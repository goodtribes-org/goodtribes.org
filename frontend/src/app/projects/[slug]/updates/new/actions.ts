"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

const prisma = new PrismaClient();

export async function createBlogPost(slug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { slug },
    include: { members: true },
  });
  if (!project) redirect("/projects");

  const isMember = project.members.some(
    (m) => m.userId === session.user!.id && ["owner", "admin"].includes(m.role)
  );
  if (!isMember) redirect(`/projects/${slug}`);

  const title = (formData.get("title") as string).trim();
  const body = (formData.get("body") as string).trim();
  if (!title || !body) return;

  const post = await prisma.blogPost.create({
    data: { projectSlug: slug, authorId: session.user.id, title, body },
  });

  await logActivity(project.id, session.user.id, "update_posted", { title: post.title });

  // Notify all project members
  const followers = project.members.filter((m) => m.userId !== session.user!.id);
  await Promise.all(
    followers.map((m) =>
      createNotification({
        userId: m.userId,
        type: "blog_post",
        title: `New update in ${project.title}`,
        body: title,
        url: `/projects/${slug}/updates`,
      })
    )
  );

  revalidatePath(`/projects/${slug}/updates`);
  redirect(`/projects/${slug}/updates`);
}
