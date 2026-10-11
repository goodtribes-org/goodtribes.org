export const dynamic = "force-dynamic";

import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { resolveAiMode, isAiCallAllowed } from "@/lib/aiMode";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";
import MatchList from "./MatchList";
import ApplicationList from "./ApplicationList";
import FundingNeedField from "./FundingNeedField";
import CallMatches from "./CallMatches";
import { closesIn } from "@/lib/fundingCalls/matching";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await notFoundUnlessVisible(slug);
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Fondansökningar` };
}

export default async function FundingApplicationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await notFoundUnlessVisible(slug);
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      estimatedFundingNeedSek: true,
      // Utlysningar (#345): the call this project applies to, and calls that fit.
      fundingCall: { select: { slug: true, title: true, deadline: true, rolling: true, status: true, fundingSource: { select: { name: true } } } },
      fundingCallMatches: {
        where: { dismissedAt: null, fundingCall: { status: "PUBLISHED", OR: [{ rolling: true }, { deadline: { gt: new Date() } }] } },
        orderBy: { matchedAt: "desc" },
        select: { id: true, reasons: true, fundingCall: { select: { slug: true, title: true, deadline: true, rolling: true, fundingSource: { select: { name: true } } } } },
      },
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

      {project.fundingCall?.slug && (
        <div className="mb-6 rounded-xl border border-coral/30 bg-coral/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-coral">
            Projektet söker · {project.fundingCall.fundingSource.name} · {closesIn(project.fundingCall.rolling ? null : project.fundingCall.deadline)}
          </p>
          <Link href={`/utlysningar/${project.fundingCall.slug}`} className="mt-0.5 block font-semibold text-dark-slate hover:underline">
            {project.fundingCall.title}
          </Link>
          <p className="mt-1 text-sm text-dark-slate/70">
            Projektet är ett privat utkast: bara teamet ser det, eftersom flera kan söka samma pengar. Ansökan lämnas in i en GoodTribes-enhets namn och granskas av GoodTribes först.
          </p>
        </div>
      )}

      {canManage && <FundingNeedField projectSlug={slug} initialValue={project.estimatedFundingNeedSek} />}

      {project.fundingCallMatches.length > 0 && (
        <>
          <h2 className="text-xs font-semibold text-dark-slate/40 uppercase tracking-wide mb-2">Utlysningar som passar</h2>
          <div className="mb-8">
            <CallMatches
              projectSlug={slug}
              canManage={canManage}
              matches={project.fundingCallMatches.filter((m) => m.fundingCall.slug).map((m) => ({
                id: m.id,
                slug: m.fundingCall.slug!,
                title: m.fundingCall.title,
                funder: m.fundingCall.fundingSource.name,
                closes: closesIn(m.fundingCall.rolling ? null : m.fundingCall.deadline),
                reasons: m.reasons,
              }))}
            />
          </div>
        </>
      )}

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
