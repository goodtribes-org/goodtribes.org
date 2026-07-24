import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import MembersManager from "./MembersManager";
import type { Metadata } from "next";
import { isLeadRole, isSiteAdmin } from "@/lib/authz";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Medlemmar` };
}

export default async function MembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      members: {
        include: { user: { select: { id: true, name: true, image: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      joinRequests: {
        where: { status: "pending" },
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!project) notFound();

  const membership = project.members.find((m) => m.user.id === session.user!.id);
  const viewerIsSiteAdmin = await isSiteAdmin(session.user.id);
  const isOwnerOrAdmin = isLeadRole(membership?.role) || viewerIsSiteAdmin;
  if (!isOwnerOrAdmin) redirect(`/projects/${slug}`);

  return (
    <MembersManager
      project={{ id: project.id, slug, title: project.title }}
      viewerRole={membership?.role ?? null}
      viewerIsSiteAdmin={viewerIsSiteAdmin}
      members={project.members.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        image: m.user.image,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      }))}
      joinRequests={project.joinRequests.map((r) => ({
        id: r.id,
        message: r.message,
        user: r.user,
        createdAt: r.createdAt.toISOString(),
      }))}
      currentUserId={session.user.id}
    />
  );
}
