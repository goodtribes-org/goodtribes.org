export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import ResourceLibrary from "@/components/ResourceLibrary";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";
import { getTranslations } from "next-intl/server";


export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  const t = await getTranslations({ locale, namespace: "FilesPage" });
  return { title: t("pageTitle", { title: project.title }) };
}

export default async function ProjectFilesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const t = await getTranslations("FilesPage");

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      members: { where: { userId: session?.user?.id ?? "" } },
    },
  });
  if (!project) notFound();

  const isMember = !!session?.user?.id && project.members.length > 0;

  const files = isMember
    ? await prisma.file.findMany({
        where: { projectId: project.id },
        select: { id: true, key: true, name: true, size: true, mimeType: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="max-w-2xl">
      <WorkspacePageHeader title={t("heading")} help={t("helpText")} />

      {isMember ? (
        <ResourceLibrary
          projectId={project.id}
          files={files.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))}
          canUpload={isMember}
        />
      ) : (
        <p className="text-dark-slate/40 italic text-sm">{t("membersOnlyNotice")}</p>
      )}
    </div>
  );
}
