export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getCanvasAiContext } from "@/lib/canvasAi";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";
import ImpactModelChain from "./ImpactModelChain";
import ImpactModelAiBar from "./ImpactModelAiBar";
import ImpactModelHistory from "./ImpactModelHistory";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Impactmodell — GoodTribes.org` };
}

export default async function ImpactModelPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [session, t, tCanvas] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "ImpactModelPage" }),
    getTranslations({ locale, namespace: "LeanCanvasPage" }),
  ]);

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      impactModel: true,
      leanCanvas: { select: { impact: true, problem: true } },
    },
  });
  if (!project) notFound();

  const canEdit = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;
  // vet/antar, suggestions and the AI button ship behind ai-project-start.
  const aiOn = await isFeatureEnabled("ai-project-start", session?.user?.id);
  const [ai, canvasAi] = aiOn
    ? await Promise.all([getCanvasAiContext(project.id, "impactModel"), getCanvasAiContext(project.id, "leanCanvas")])
    : [null, null];

  return (
    <div>
      <WorkspacePageHeader title={t("pageHeading")} help={t("helpText")} action={<ImpactModelHistory projectSlug={slug} />} />

      {ai?.aiAvailable && <ImpactModelAiBar projectSlug={slug} stepKey={ai.stepKey} mode={ai.mode} canEdit={canEdit} />}
      <ImpactModelChain
        projectSlug={slug}
        model={project.impactModel}
        canvasImpact={project.leanCanvas?.impact ?? null}
        legacyProblem={project.leanCanvas?.problem?.trim() || null}
        canEdit={canEdit}
        ai={ai ?? undefined}
        canvasAi={canvasAi ?? undefined}
      />

      <p className="mt-2 text-xs text-dark-slate/40">
        {t("impactShared")}{" "}
        <Link href={`/projects/${slug}/lean-canvas`} className="text-coral hover:underline">
          {t("canvasLink")}
        </Link>
      </p>
      <p className="mt-1 text-xs text-dark-slate/40">
        <a href="https://socialleancanvas.com/templates/" target="_blank" rel="noopener noreferrer" className="hover:text-coral">
          {tCanvas("attribution")}
        </a>
      </p>
    </div>
  );
}
