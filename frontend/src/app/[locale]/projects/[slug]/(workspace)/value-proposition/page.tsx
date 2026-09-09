export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import ValuePropositionGrid from "./ValuePropositionGrid";
import ValuePropositionHistory from "./ValuePropositionHistory";
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
  return { title: `${project.title} — Värdeerbjudande — GoodTribes.org` };
}

export default async function ValuePropositionPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "ValuePropositionPage" }),
  ]);

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      valueProposition: { include: { updatedBy: { select: { name: true } } } },
    },
  });
  if (!project) notFound();

  const canEdit = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;
  const canvas = project.valueProposition;

  const helpGuide = await prisma.academyGuide.findFirst({
    where: { title: "Så använder du Värdeerbjudande-canvas", published: true },
    select: { id: true },
  });
  const helpHref = helpGuide ? `/academy/${helpGuide.id}` : "/academy?category=Projektledning";

  return (
    <div>
      <WorkspacePageHeader
        title={t("heading")}
        help={t("helpText")}
        helpMoreHref={helpHref}
        helpMoreLabel={t("helpGuideLink")}
        action={<ValuePropositionHistory projectSlug={slug} />}
      />

      <ValuePropositionGrid projectSlug={slug} canvas={canvas} canEdit={canEdit} />
    </div>
  );
}
