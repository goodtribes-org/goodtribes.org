export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import ProjectPlanForm from "./ProjectPlanForm";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";
import type { Locale } from "next-intl";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Projektplan — GoodTribes.org` };
}

export default async function ProjectPlanPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "ProjectPlanPage" }),
  ]);

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      projectPlan: { include: { updatedBy: { select: { name: true } } } },
    },
  });
  if (!project) notFound();

  const canEdit = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;

  return (
    <div>
      <WorkspacePageHeader title={t("title")} help={t("helpText")} />

      <ProjectPlanForm projectSlug={slug} plan={project.projectPlan} canEdit={canEdit} />
    </div>
  );
}
