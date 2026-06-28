export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { ChatBox } from "./ChatBox";
import type { Metadata } from "next";


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Chat — GoodTribes.org` };
}

export default async function ChatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      members: session?.user?.id ? { where: { userId: session.user.id } } : false,
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100,
        include: {
          author: { select: { name: true, image: true } },
          reactions: { select: { id: true, emoji: true, userId: true } },
        },
      },
    },
  });
  if (!project) notFound();

  const membership = ((project.members ?? []) as { role: string }[])[0];
  const isMember = !!membership;
  const isOwnerOrAdmin = membership?.role === "owner" || membership?.role === "admin";

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/projects/${slug}`} className="text-xs text-dark-slate/40 hover:text-dark-slate">
          ← {project.title}
        </Link>
        <h1 className="text-xl font-bold text-dark-slate mt-0.5">Team chat</h1>
        <p className="text-xs text-dark-slate/40 mt-0.5">Visible to project members only.</p>
      </div>

      <ChatBox
        projectId={project.id}
        slug={slug}
        messages={project.messages}
        isMember={isMember}
        isOwnerOrAdmin={isOwnerOrAdmin}
        currentUserId={session?.user?.id ?? null}
      />
    </div>
  );
}
