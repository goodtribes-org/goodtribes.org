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
import { LEGACY_LEAN_CANVAS_BLOCKS } from "./fields";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";
import type { Locale } from "next-intl";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getCanvasAiContext } from "@/lib/canvasAi";
import CanvasAiBar from "@/components/ai/CanvasAiBar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Social Lean Canvas — GoodTribes.org` };
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
  // vet/antar marking ships dark behind the ai-project-start flag.
  const ai = (await isFeatureEnabled("ai-project-start", session?.user?.id))
    ? await getCanvasAiContext(project.id, "leanCanvas")
    : null;

  const legacy = canvas ? LEGACY_LEAN_CANVAS_BLOCKS.filter((b) => canvas[b.field]?.trim()) : [];
  const tField = await getTranslations({ locale, namespace: "LeanCanvasHistory" });

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

      {ai?.aiAvailable && <CanvasAiBar projectSlug={slug} entity="leanCanvas" stepKey={ai.stepKey} mode={ai.mode} canEdit={canEdit} />}
      <LeanCanvasGrid
        projectSlug={slug}
        canvas={canvas}
        canEdit={canEdit}
        provenance={ai?.provenance}
        suggestions={ai?.suggestions}
      />
      <p className="mt-2 text-xs text-dark-slate/40">
        <a href="https://socialleancanvas.com" target="_blank" rel="noopener noreferrer" className="hover:text-coral">
          {t("attribution")}
        </a>
      </p>

      {canvas && legacy.length > 0 && (
        <section className="mt-6 rounded-lg border border-dashed border-dark-slate/20 p-4">
          <h2 className="text-sm font-bold text-dark-slate">{t("legacyHeading")}</h2>
          <p className="mt-1 text-xs text-dark-slate/50">{t("legacyNote")}</p>
          <div className="mt-3 space-y-3">
            {legacy.map((b) => (
              <div key={b.field}>
                <h3 className="text-xs font-bold text-dark-slate uppercase tracking-wide">
                  {tField(`field${b.translationKey}` as Parameters<typeof tField>[0])}
                </h3>
                <p className="text-sm text-dark-slate/80 whitespace-pre-wrap mt-0.5">{canvas[b.field]}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <LeanCanvasComments
        projectSlug={slug}
        comments={comments}
        canComment={canComment}
        currentUserId={session?.user?.id ?? null}
      />
    </div>
  );
}
