export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCanvasFieldLabels } from "@/lib/canvasFieldLabels";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { getFieldProvenance } from "@/lib/fieldProvenance";
import { getCanvasAiContext } from "@/lib/canvasAi";
import { parseOpenQuestions } from "@/lib/dreamConversation";
import { isFillInProgress, parseFillStatus, withStaleAsFailed } from "@/lib/ideaFill";
import CanvasAiBar from "@/components/ai/CanvasAiBar";
import LeanCanvasGrid from "../lean-canvas/LeanCanvasGrid";
import ValuePropositionGrid from "../value-proposition/ValuePropositionGrid";
import ImpactModelChain from "../impact-model/ImpactModelChain";
import AddOrInviteMember from "../../AddOrInviteMember";
import OverviewSection from "./OverviewSection";
import AboutSection from "./AboutSection";
import SdgSection from "./SdgSection";
import FillPoller from "./FillPoller";
import RetryButton from "./RetryButton";
import CritiqueBox from "./CritiqueBox";
import InterviewSynthesisPanel from "./InterviewSynthesisPanel";
import PhaseGateSection from "./PhaseGateSection";
import { ideaGateCriteria, type GateBrief } from "@/lib/phaseGate";
import { currentAssumptions, latestInsight, type CritiqueContent, type SynthesisContent } from "@/lib/ideaInsights";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";

// The Idé phase on one page, top to bottom — what the AI produced after
// Drömsamtalet (in AGENT mode), shown as plain content with vet/antar and an
// Edit per section, followed by what only a human can do: interviews and
// inviting people. Snabbstart stays available for step-by-step editing.
export default async function IdeaOverviewPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [journeyOn, project] = await Promise.all([
    isFeatureEnabled("ai-project-start", session.user.id),
    prisma.project.findUnique({
    where: { slug },
    select: {
      id: true, phase: true, title: true, summary: true, description: true, category: true, tags: true, sdgGoals: true,
      leanCanvas: true, valueProposition: true, impactModel: true,
      dreamConversation: { select: { fillStatus: true, openQuestions: true, updatedAt: true } },
    },
    }),
  ]);
  if (!journeyOn) redirect(`/projects/${slug}/guide`);
  if (!project) notFound();

  const [
    t, fieldLabels, canEdit, projectProv, leanCanvasAi, valuePropositionAi, marketScan, interviewGuide, interviews,
    critique, synthesis, assumptions, aiAvailable, tGate, tCheck, isFounder, gate, gateBrief, lastDecision, impactModelAi,
  ] = await Promise.all([
    getTranslations({ locale, namespace: "IdeaOverview" }),
    getCanvasFieldLabels(locale),
    hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES),
    getFieldProvenance(project.id, "project"),
    getCanvasAiContext(project.id, "leanCanvas"),
    getCanvasAiContext(project.id, "valueProposition"),
    prisma.marketScanEntry.findMany({ where: { projectSlug: slug }, orderBy: { createdAt: "asc" } }),
    prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: slug, slug: "intervjuguide" } }, select: { slug: true } }),
    prisma.interviewLogEntry.findMany({ where: { projectSlug: slug }, select: { id: true, personaName: true } }),
    latestInsight<CritiqueContent>(project.id, "CRITIQUE"),
    latestInsight<SynthesisContent>(project.id, "INTERVIEW_SYNTHESIS"),
    currentAssumptions(project.id, slug),
    isAiProjectStartAvailable(session.user.id),
    getTranslations({ locale, namespace: "PhaseGate" }),
    getTranslations({ locale, namespace: "ProjectPhaseChecklist" }),
    hasProjectRole(project.id, session.user.id, ["FOUNDER"]),
    ideaGateCriteria(project.id, slug),
    latestInsight<GateBrief>(project.id, "PHASE_GATE"),
    prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, fromPhase: { in: ["IDEA", "SPRINT"] } }, orderBy: { createdAt: "desc" } }),
    getCanvasAiContext(project.id, "impactModel"),
  ]);
  const inIdeaPhase = project.phase === "IDEA" || project.phase === "SPRINT";
  const criterionLabel = (key: string) => tCheck(key as Parameters<typeof tCheck>[0]);
  const decisionDate = (d: Date) => d.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const interviewCount = interviews.length;

  const fill = project.dreamConversation
    ? withStaleAsFailed(parseFillStatus(project.dreamConversation.fillStatus), project.dreamConversation.updatedAt)
    : {};
  const retry = (section: string) => (canEdit ? <RetryButton slug={slug} section={section} /> : null);
  const openQuestions = parseOpenQuestions(project.dreamConversation?.openQuestions);
  const writing = t("writing");
  const typeLabel: Record<string, string> = {
    COMPETITOR: t("scanCompetitor"),
    PARTNER_PROSPECT: t("scanPartner"),
    TREND: t("scanTrend"),
    REGULATION: t("scanRegulation"),
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 py-6">
      {isFillInProgress(fill) && <FillPoller />}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
          <p className="mt-1 text-sm text-dark-slate/60">{isFillInProgress(fill) ? t("introWriting") : t("intro")}</p>
        </div>
        <Link href={`/projects/${slug}/guide`} className="text-sm font-medium text-dark-slate/60 hover:text-coral">
          {t("stepByStep")}
        </Link>
      </div>

      {(critique || fill.critique === "pending" || fill.critique === "running" || (canEdit && aiAvailable && project.leanCanvas)) && (
        <CritiqueBox
          slug={slug}
          points={critique?.content.points ?? null}
          fieldLabels={fieldLabels}
          canEdit={canEdit && aiAvailable}
          writing={fill.critique === "pending" || fill.critique === "running"}
        />
      )}

      <OverviewSection id="om" title={t("aboutHeading")} fill={fill.about} writingLabel={writing}>
        <AboutSection
          slug={slug}
          canEdit={canEdit}
          provenance={projectProv}
          about={{
            title: project.title,
            summary: project.summary ?? "",
            description: project.description ?? "",
            descriptionHtml: project.description ? sanitizeHtml(project.description) : "",
            category: project.category ?? "",
            tags: project.tags,
          }}
        />
      </OverviewSection>

      <OverviewSection id="mal" title={t("sdgHeading")} fill={fill.about} writingLabel={writing}>
        <SdgSection slug={slug} goals={project.sdgGoals} provenance={projectProv.sdgGoals} canEdit={canEdit} />
      </OverviewSection>

      <OverviewSection
        id="lean-canvas"
        title={t("leanCanvasHeading")}
        fill={fill.leanCanvas}
        writingLabel={writing}
        failedNote={<>{t("failedCanvas")}{retry("leanCanvas")}</>}
      >
        {leanCanvasAi.aiAvailable && (
          <CanvasAiBar projectSlug={slug} entity="leanCanvas" stepKey={leanCanvasAi.stepKey} mode={leanCanvasAi.mode} canEdit={canEdit} />
        )}
        <LeanCanvasGrid
          projectSlug={slug}
          canvas={project.leanCanvas}
          canEdit={canEdit}
          provenance={leanCanvasAi.provenance}
          suggestions={leanCanvasAi.suggestions}
        />
      </OverviewSection>

      <OverviewSection
        id="impactmodell"
        title={t("impactModelHeading")}
        fill={fill.impactModel}
        writingLabel={writing}
        failedNote={<>{t("failedCanvas")}{retry("impactModel")}</>}
        action={
          <Link href={`/projects/${slug}/impact-model`} className="text-sm font-medium text-dark-slate/50 hover:text-coral">
            {t("open")}
          </Link>
        }
      >
        <ImpactModelChain
          projectSlug={slug}
          model={project.impactModel}
          canvasImpact={project.leanCanvas?.impact ?? null}
          legacyProblem={project.leanCanvas?.problem?.trim() || null}
          canEdit={canEdit}
          ai={impactModelAi}
          canvasAi={leanCanvasAi}
        />
      </OverviewSection>

      <OverviewSection
        id="vardeerbjudande"
        title={t("valuePropositionHeading")}
        fill={fill.valueProposition}
        writingLabel={writing}
        failedNote={<>{t("failedCanvas")}{retry("valueProposition")}</>}
      >
        <ValuePropositionGrid
          projectSlug={slug}
          canvas={project.valueProposition}
          canEdit={canEdit}
          provenance={valuePropositionAi.provenance}
          suggestions={valuePropositionAi.suggestions}
        />
      </OverviewSection>

      <OverviewSection
        id="omvarld"
        title={t("marketScanHeading")}
        fill={fill.marketScan === "skipped" ? undefined : fill.marketScan}
        writingLabel={t("writingMarketScan")}
        failedNote={<>{t("failedMarketScan")}{retry("marketScan")}</>}
        action={
          <Link href={`/projects/${slug}/market-scan`} className="text-sm font-medium text-dark-slate/50 hover:text-coral">
            {canEdit ? t("manage") : t("open")}
          </Link>
        }
      >
        {marketScan.length === 0 ? (
          <p className="text-sm text-dark-slate/50">{t("marketScanEmpty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-muted-teal/20">
            {marketScan.map((e) => (
              <li key={e.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-dark-slate">{e.name}</span>
                  <span className="rounded-full bg-dry-sage/30 px-2 py-0.5 text-[11px] text-dark-slate/60">{typeLabel[e.type]}</span>
                  {e.createdByAi && (
                    <span className="rounded-full border border-coral/40 bg-coral/10 px-1.5 py-px text-[10px] font-medium text-coral">{t("foundByAi")}</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-dark-slate/80">{e.description}</p>
                {e.relevanceNote && <p className="mt-1 text-xs text-dark-slate/60">{e.relevanceNote}</p>}
                {e.sourceUrl && (
                  <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all text-xs text-seagrass hover:underline">
                    {t("source")}: {e.sourceUrl}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </OverviewSection>

      {openQuestions.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-dark-slate">{t("thinkAboutHeading")}</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-dark-slate/80">
            {openQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      )}

      <OverviewSection
        id="intervjuer"
        title={t("interviewsHeading")}
        badge={t("yourTurn")}
        fill={fill.interviewGuide === "skipped" ? undefined : fill.interviewGuide}
        writingLabel={t("writingInterviewGuide")}
        failedNote={<>{t("failedInterviewGuide")}{retry("interviewGuide")}</>}
      >
        <p className="text-sm text-dark-slate/70">{t("interviewsIntro")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {interviewGuide && (
            <Link href={`/projects/${slug}/wiki/intervjuguide`} className="rounded-lg border border-seagrass/60 px-3 py-1.5 text-sm font-medium text-seagrass hover:bg-seagrass/10">
              {t("openInterviewGuide")}
            </Link>
          )}
          <Link href={`/projects/${slug}/interviews`} className="rounded-lg bg-coral px-3 py-1.5 text-sm font-semibold text-white hover:bg-watermelon">
            {t("logInterviews")}
          </Link>
          <span className="text-sm text-dark-slate/60">{t("interviewCount", { count: interviewCount })}</span>
        </div>
        <InterviewSynthesisPanel
          slug={slug}
          interviewCount={interviewCount}
          synthesis={synthesis?.content ?? null}
          stillAssumed={assumptions.map((a) => a.key)}
          fieldLabels={fieldLabels}
          personaById={Object.fromEntries(interviews.map((i) => [i.id, i.personaName]))}
          canEdit={canEdit}
          aiAvailable={aiAvailable}
        />
      </OverviewSection>

      <OverviewSection id="bjud-in" title={t("inviteHeading")} badge={t("yourTurn")} writingLabel={writing}>
        <p className="mb-3 text-sm text-dark-slate/70">{t("inviteIntro")}</p>
        {canEdit ? <AddOrInviteMember projectId={project.id} slug={slug} /> : <p className="text-sm text-dark-slate/50">{t("inviteLeadsOnly")}</p>}
      </OverviewSection>

      {inIdeaPhase ? (
        <OverviewSection id="fasgrind" title={t("gateHeading")} badge={t("yourTurn")} writingLabel={writing}>
          <PhaseGateSection
            gate="idea"
            slug={slug}
            criteria={gate.criteria.map((c) => ({ ...c, label: criterionLabel(c.key) }))}
            countNote={{ key: "target_audience_interviews", text: tGate("interviewsOf", { count: gate.interviewCount }) }}
            brief={gateBrief?.content ?? null}
            lastDecision={
              lastDecision
                ? { outcome: lastDecision.outcome, date: decisionDate(lastDecision.createdAt), missing: lastDecision.missing.map(criterionLabel) }
                : null
            }
            fieldLabels={fieldLabels}
            canEdit={canEdit}
            isFounder={isFounder}
            aiAvailable={aiAvailable}
          />
        </OverviewSection>
      ) : (
        lastDecision?.outcome === "CONTINUE" && (
          <p className="rounded-2xl border border-seagrass/30 bg-seagrass/5 px-5 py-3 text-sm text-dark-slate/75">
            {t("gateClosed", { date: decisionDate(lastDecision.createdAt) })}{" "}
            <Link href={`/projects/${slug}/uppstart`} className="font-semibold text-seagrass hover:underline">
              {t("gateClosedLink")}
            </Link>
          </p>
        )
      )}
    </div>
  );
}
