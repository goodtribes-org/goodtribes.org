export const dynamic = "force-dynamic";

import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isRealMember } from "@/lib/authz";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { canSeeInterviewNotes } from "@/lib/interviewAccess";
import InterviewLogTable from "./InterviewLogTable";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await notFoundUnlessVisible(slug);
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Målgruppsintervjuer` };
}

export default async function InterviewLogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await notFoundUnlessVisible(slug);
  const session = await auth();

  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (!project) notFound();

  const canLog = session?.user?.id ? await isRealMember(project.id, session.user.id) : false;
  if (!(await canSeeInterviewNotes(project.id, session?.user?.id))) {
    const t = await getTranslations("InterviewLogPage");
    return (
      <div className="max-w-2xl rounded-xl border border-muted-teal/30 bg-white p-6">
        <h1 className="text-lg font-semibold text-dark-slate">{t("membersOnlyHeading")}</h1>
        <p className="mt-2 text-sm text-dark-slate/70">{t("membersOnlyBody")}</p>
        <Link href={`/projects/${slug}`} className="mt-3 inline-block text-sm font-medium text-coral hover:underline">{t("membersOnlyLink")}</Link>
      </div>
    );
  }

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
