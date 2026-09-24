export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";
import LeanCanvasBlock from "../lean-canvas/LeanCanvasBlock";
import ImpactModelBlock from "./ImpactModelBlock";
import { IMPACT_MODEL_BLOCKS } from "./fields";

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
  const [session, t, tCanvas, tField] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "ImpactModelPage" }),
    getTranslations({ locale, namespace: "LeanCanvasPage" }),
    getTranslations({ locale, namespace: "LeanCanvasHistory" }),
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
  const model = project.impactModel;
  const legacyProblem = project.leanCanvas?.problem?.trim();

  return (
    <div>
      <WorkspacePageHeader title={t("pageHeading")} help={t("helpText")} />

      <style>{`
        .impactmodel-chain { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
        @media (min-width: 1100px) {
          .impactmodel-chain { grid-template-columns: repeat(7, minmax(0, 1fr)); }
        }
      `}</style>

      <div className="impactmodel-chain">
        {IMPACT_MODEL_BLOCKS.map((b) => (
          <ImpactModelBlock
            key={b.field}
            projectSlug={slug}
            field={b.field}
            label={t(`field${b.translationKey}` as Parameters<typeof t>[0])}
            hint={t(`hint${b.translationKey}` as Parameters<typeof t>[0])}
            value={model?.[b.field] ?? null}
            canEdit={canEdit}
            legacy={b.field === "issue" && legacyProblem ? { label: t("legacyProblem"), text: legacyProblem } : undefined}
          />
        ))}
        {/* The last step is the canvas's own Impact block — one field, two views. */}
        <LeanCanvasBlock
          projectSlug={slug}
          field="impact"
          area="impact"
          label={tField("fieldImpact")}
          hint={t("hintImpact")}
          value={project.leanCanvas?.impact ?? null}
          canEdit={canEdit}
        />
      </div>

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
