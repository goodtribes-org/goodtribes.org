export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isRealMember } from "@/lib/authz";
import InterviewLogTable from "./InterviewLogTable";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Målgruppsintervjuer — GoodTribes.org` };
}

export default async function InterviewLogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (!project) notFound();

  const canLog = session?.user?.id ? await isRealMember(project.id, session.user.id) : false;

  const entries = await prisma.interviewLogEntry.findMany({
    where: { projectSlug: slug },
    orderBy: { date: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return (
    <InterviewLogTable
      projectSlug={slug}
      entries={entries}
      canLog={canLog}
      currentUserId={session?.user?.id ?? null}
    />
  );
}
