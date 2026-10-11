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
import CallApplicationCard, { type CallApplication } from "./CallApplicationCard";
import StartCallApplication from "./StartCallApplication";
import { reviewLeadDays, suggestEntity } from "@/lib/fundingCalls/review";
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
      fundingCallId: true,
      fundingCall: { select: { slug: true, title: true, deadline: true, rolling: true, status: true, fundingSource: { select: { name: true } } } },
      fundingCallMatches: {
        where: { dismissedAt: null, fundingCall: { status: "PUBLISHED", OR: [{ rolling: true }, { deadline: { gt: new Date() } }] } },
        orderBy: { matchedAt: "desc" },
        select: { id: true, fundingCallId: true, reasons: true, fundingCall: { select: { slug: true, title: true, deadline: true, rolling: true, fundingSource: { select: { name: true } } } } },
      },
      fundingMatches: {
        where: { dismissedAt: null },
        orderBy: { matchedAt: "desc" },
        include: { fundingSource: true },
      },
      fundingApplications: {
        orderBy: { createdAt: "desc" },
        include: {
          fundingSource: true,
          // Utlysningar (#346): the call, the applicant entity and the review so far.
          fundingCall: { select: { slug: true, title: true, requirements: true, applyUrl: true, url: true, deadline: true, cofunding: true, applicantTypes: true } },
          applicantEntity: { select: { name: true, kind: true } },
          reviews: { orderBy: { createdAt: "desc" }, select: { level: true, result: true, motivation: true, findings: true } },
        },
      },
    },
  });
  if (!project) return null;

  const canManage = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;

  // Applications to a funding call (#346) get their own card; the rest stay as before.
  const callApps = project.fundingApplications.filter((a) => a.fundingCall);
  const sourceApps = project.fundingApplications.filter((a) => !a.fundingCall);
  const appliedCallIds = new Set(callApps.map((a) => a.fundingCallId));
  const entities = callApps.length ? await prisma.commercialUmbrellaEntity.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true, status: true, applicantTypes: true } }) : [];
  const leadDays = reviewLeadDays();
  const callCards: { app: CallApplication; entities: { id: string; name: string; kind: string; status: string; suggested: boolean }[] }[] = callApps.map((a) => {
    const suggested = suggestEntity(a.fundingCall!.applicantTypes, entities);
    const check = a.reviews.find((r) => r.level === "CHECK");
    const decision = a.reviews.find((r) => r.level === "HUMAN");
    return {
      entities: entities.map((e) => ({ id: e.id, name: e.name, kind: e.kind, status: e.status, suggested: e.id === suggested })),
      app: {
        id: a.id,
        status: a.status,
        call: { slug: a.fundingCall!.slug, title: a.fundingCall!.title, requirements: a.fundingCall!.requirements, applyUrl: a.fundingCall!.applyUrl, url: a.fundingCall!.url, deadline: a.fundingCall!.deadline?.toISOString() ?? null },
        entityId: a.applicantEntityId,
        entityKind: a.applicantEntity?.kind ?? null,
        entityName: a.applicantEntity?.name ?? null,
        requirementsDone: a.requirementsDone,
        amountRequestedSek: a.amountRequestedSek,
        cofunding: a.fundingCall!.cofunding,
        cofundingNote: a.cofundingNote,
        reviewBy: a.fundingCall!.deadline ? new Date(a.fundingCall!.deadline.getTime() - leadDays * 86_400_000).toISOString() : null,
        submittedAt: a.submittedAt?.toISOString() ?? null,
        outcomeAmountSek: a.outcomeAmountSek,
        outcomeNote: a.outcomeNote,
        findings: check?.result === "CHANGES" && ["draft", "ai_drafted", "changes_requested"].includes(a.status) ? check.findings : [],
        decision: decision ? { result: decision.result, motivation: decision.motivation } : null,
      },
    };
  });

  const appliedSourceIds = new Set(sourceApps.map((a) => a.fundingSourceId));
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
          {canManage && project.fundingCallId && !appliedCallIds.has(project.fundingCallId) && (
            <div className="mt-3">
              <StartCallApplication projectSlug={slug} fundingCallId={project.fundingCallId} />
            </div>
          )}
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
                callId: m.fundingCallId,
                applied: appliedCallIds.has(m.fundingCallId),
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
      {callCards.length > 0 && (
        <div className="mb-3 flex flex-col gap-3">
          {callCards.map((c) => (
            <CallApplicationCard key={c.app.id} app={c.app} entities={c.entities} projectSlug={slug} canManage={canManage} />
          ))}
        </div>
      )}
      {project.fundingApplications.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-lg p-8 text-center">
          <p className="text-dark-slate/40 text-sm">Inga ansökningar påbörjade än.</p>
        </div>
      ) : (
        <ApplicationList
          applications={sourceApps}
          projectSlug={slug}
          canManage={canManage}
          aiModeEnabled={isAiCallAllowed(fundingAiMode, "agent")}
        />
      )}
    </div>
  );
}
