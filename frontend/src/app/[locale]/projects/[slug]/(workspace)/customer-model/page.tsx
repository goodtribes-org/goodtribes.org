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
import CanvasAiBar from "@/components/ai/CanvasAiBar";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";
import LeanCanvasHistory from "../lean-canvas/LeanCanvasHistory";
import CustomerModelGrid from "./CustomerModelGrid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Kundmodell — GoodTribes.org` };
}

export default async function CustomerModelPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [session, t, tCanvas] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "CustomerModelPage" }),
    getTranslations({ locale, namespace: "LeanCanvasPage" }),
  ]);

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, leanCanvas: true },
  });
  if (!project) notFound();

  const canEdit = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;
  // Same row as the canvas, so the same AI context (vet/antar, suggestions, review).
  const ai = (await isFeatureEnabled("ai-project-start", session?.user?.id))
    ? await getCanvasAiContext(project.id, "leanCanvas")
    : null;

  return (
    <div>
      <WorkspacePageHeader title={t("pageHeading")} help={t("helpText")} action={<LeanCanvasHistory projectSlug={slug} />} />

      {ai?.aiAvailable && <CanvasAiBar projectSlug={slug} entity="leanCanvas" stepKey={ai.stepKey} mode={ai.mode} canEdit={canEdit} />}
      <CustomerModelGrid
        projectSlug={slug}
        canvas={project.leanCanvas}
        canEdit={canEdit}
        provenance={ai?.provenance}
        suggestions={ai?.suggestions}
      />

      <p className="mt-2 text-xs text-dark-slate/40">
        {t("shared")}{" "}
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
