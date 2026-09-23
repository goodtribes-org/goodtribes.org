export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { resolveAiMode, isAiCallAllowed } from "@/lib/aiMode";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";
import MatchList from "./MatchList";
import ApplicationList from "./ApplicationList";
import FundingNeedField from "./FundingNeedField";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Fondansökningar — GoodTribes.org` };
}

export default async function FundingApplicationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      estimatedFundingNeedSek: true,
      fundingMatches: {
        where: { dismissedAt: null },
        orderBy: { matchedAt: "desc" },
        include: { fundingSource: true },
      },
      fundingApplications: {
        orderBy: { createdAt: "desc" },
        include: { fundingSource: true },
      },
    },
  });
  if (!project) return null;

  const canManage = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;

  const appliedSourceIds = new Set(project.fundingApplications.map((a) => a.fundingSourceId));
  const openMatches = project.fundingMatches.filter((m) => !appliedSourceIds.has(m.fundingSourceId));

  const { mode: fundingAiMode } = await resolveAiMode({ projectId: project.id, feature: "funding-applications" });

  return (
    <div className="max-w-2xl">
      <WorkspacePageHeader
        title="Fondansökningar"
        help="Matchande fonder och bidrag baserat på projektets SDG-mål, juridiska form och finansieringsbehov, samt spårning av era ansökningar."
      />

      {canManage && <FundingNeedField projectSlug={slug} initialValue={project.estimatedFundingNeedSek} />}

      <h2 className="text-xs font-semibold text-dark-slate/40 uppercase tracking-wide mb-2">Matchningar</h2>
      {openMatches.length === 0 ? (
        <p className="text-sm text-dark-slate/40 mb-6">Inga nya matchningar just nu.</p>
      ) : (
        <div className="mb-8">
          <MatchList matches={openMatches} projectSlug={slug} canManage={canManage} />
        </div>
      )}

      <h2 className="text-xs font-semibold text-dark-slate/40 uppercase tracking-wide mb-2">Ansökningar</h2>
      {project.fundingApplications.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-lg p-8 text-center">
          <p className="text-dark-slate/40 text-sm">Inga ansökningar påbörjade än.</p>
        </div>
      ) : (
        <ApplicationList
          applications={project.fundingApplications}
          projectSlug={slug}
          canManage={canManage}
          aiModeEnabled={isAiCallAllowed(fundingAiMode, "agent")}
        />
      )}
    </div>
  );
}
