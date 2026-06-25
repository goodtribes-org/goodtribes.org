"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/notify";
import { logActivity } from "@/lib/activity";
import { sendEmail } from "@/lib/email";

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

  const followers = project.members.filter((m) => m.userId !== session.user!.id);

  // In-app notifications
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

  // Email notification to members (best-effort)
  if (followers.length > 0) {
    const followerUsers = await prisma.user.findMany({
      where: { id: { in: followers.map((m) => m.userId) } },
      select: { email: true, name: true },
    });
    const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";
    await Promise.all(
      followerUsers
        .filter((u) => u.email)
        .map((u) =>
          sendEmail({
            to: u.email!,
            subject: `New update in ${project.title}: ${title}`,
            html: `<p>Hi ${u.name ?? "there"},</p><p><strong>${project.title}</strong> just posted a new update: <strong>${title}</strong></p><p><a href="${base}/projects/${slug}/updates" style="background:#E85D4A;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0;">Read update →</a></p>`,
          }).catch(() => {})
        )
    );
  }

  revalidatePath(`/projects/${slug}/updates`);
  redirect(`/projects/${slug}/updates`);
}
