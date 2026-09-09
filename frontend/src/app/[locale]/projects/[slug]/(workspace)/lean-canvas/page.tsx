export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { hasProjectRole, isRealMember, PROJECT_LEAD_ROLES } from "@/lib/authz";
import LeanCanvasGrid from "./LeanCanvasGrid";
import LeanCanvasComments from "./LeanCanvasComments";
import LeanCanvasHistory from "./LeanCanvasHistory";
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
  return { title: `${project.title} — Lean Canvas — GoodTribes.org` };
}

export default async function LeanCanvasPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "LeanCanvasPage" }),
  ]);

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      leanCanvas: { include: { updatedBy: { select: { name: true } } } },
    },
  });
  if (!project) notFound();

  const canEdit = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;
  const canComment = session?.user?.id ? await isRealMember(project.id, session.user.id) : false;
  const canvas = project.leanCanvas;

  const helpGuide = await prisma.academyGuide.findFirst({
    where: { title: "Så använder du Lean Canvas", published: true },
    select: { id: true },
  });
  const helpHref = helpGuide ? `/academy/${helpGuide.id}` : "/academy?category=Projektledning";

  const comments = await prisma.leanCanvasComment.findMany({
    where: { projectSlug: slug, hiddenAt: null },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true } } },
  });

  return (
    <div>
      <WorkspacePageHeader
        title={t("pageHeading")}
        help={t("helpText")}
        helpMoreHref={helpHref}
        helpMoreLabel={t("helpGuideLink")}
        action={<LeanCanvasHistory projectSlug={slug} />}
      />

      <LeanCanvasGrid projectSlug={slug} canvas={canvas} canEdit={canEdit} />

      <LeanCanvasComments
        projectSlug={slug}
        comments={comments}
        canComment={canComment}
        currentUserId={session?.user?.id ?? null}
      />
    </div>
  );
}
