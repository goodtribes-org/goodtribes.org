export const dynamic = "force-dynamic";

import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCanvasFieldLabels } from "@/lib/canvasFieldLabels";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPhaseWork, gateWork } from "@/lib/phaseWork";
import { Link } from "@/i18n/navigation";
import { resolveAiMode } from "@/lib/aiMode";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { getAutoDoneKeys } from "@/lib/projectSignals";
import PhaseSteps, { type PhaseStep } from "./PhaseSteps";
import type { StepCard } from "./StepCards";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { getFieldProvenance } from "@/lib/fieldProvenance";
import { getCanvasAiContext } from "@/lib/canvasAi";
import { parseOpenQuestions } from "@/lib/dreamConversation";
import { isFillInProgress, parseFillStatus, withStaleAsFailed } from "@/lib/ideaFill";
import CanvasAiBar from "@/components/ai/CanvasAiBar";
import { CanvasIterateProvider } from "@/components/ai/BlockIterateMenu";
import LeanCanvasGrid from "../lean-canvas/LeanCanvasGrid";
import ValuePropositionGrid from "../value-proposition/ValuePropositionGrid";
import ImpactModelChain from "../impact-model/ImpactModelChain";
import OverviewSection from "./OverviewSection";
import AboutSection from "./AboutSection";
import SdgSection, { SdgAiButton } from "./SdgSection";
import AboutAiDraft from "./AboutAiDraft";
import StepDone, { StepActions } from "./StepDone";
import StartTogetherQuestion from "./StartTogetherQuestion";
import MarketScanTemplate from "./MarketScanTemplate";
import InterviewTemplate from "./InterviewTemplate";
import InterviewAiDraft from "./InterviewAiDraft";
import FillPoller from "./FillPoller";
import RetryButton from "./RetryButton";
import CritiqueBox from "./CritiqueBox";
import { pickGuesses } from "@/lib/ideaStart";
import StartHere from "./StartHere";
import CollapsibleSection from "./CollapsibleSection";
import { LEAN_CANVAS_FIELDS } from "../lean-canvas/fields";
import { VALUE_PROPOSITION_FIELDS } from "../value-proposition/fields";
import { IMPACT_MODEL_FIELDS } from "../impact-model/fields";
import InterviewSynthesisPanel from "./InterviewSynthesisPanel";
import PhaseGateSection from "./PhaseGateSection";
import { ideaGateCriteria, type GateBrief } from "@/lib/phaseGate";
import { currentAssumptions, latestInsight, type CritiqueContent, type SynthesisContent } from "@/lib/ideaInsights";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import PhaseProgressStrip from "../../PhaseProgressStrip";

// The Idé phase on one page, top to bottom — what the AI produced after
// Drömsamtalet (in AGENT mode), shown as plain content with vet/antar and an
// Edit per section, followed by what only a human can do: interviews and
// inviting people. Snabbstart stays available for step-by-step editing.
// Which assumptions an interview can test first: who the target group is,
// their problem and how they solve it today, then the rest. Figures (costs,
// metrics, revenue) last — interviews rarely settle those.
const INTERVIEW_ORDER = [
  "leanCanvas.customerSegments", "leanCanvas.jobsToBeDone", "valueProposition.vpPains", "valueProposition.vpJobs",
  "leanCanvas.alternatives", "leanCanvas.earlyAdopters", "impactModel.issue", "impactModel.participants",
  "leanCanvas.uniqueValueProposition", "valueProposition.vpGains", "leanCanvas.solution", "leanCanvas.channels",
];
const INTERVIEW_LAST = ["leanCanvas.keyMetrics", "leanCanvas.costStructure", "leanCanvas.revenueStreams", "leanCanvas.unfairAdvantage"];
function interviewPriority(key: string): number {
  const i = INTERVIEW_ORDER.indexOf(key);
  if (i >= 0) return i;
  return INTERVIEW_LAST.includes(key) ? 100 + INTERVIEW_LAST.indexOf(key) : 50;
}

export default async function IdeaOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { locale, slug } = await params;
  await notFoundUnlessVisible(slug);
  const { view } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [project] = await Promise.all([
    prisma.project.findUnique({
    where: { slug },
    select: {
      id: true, phase: true, title: true, summary: true, description: true, imageUrl: true, inviteQuestionDismissedAt: true, category: true, tags: true, sdgGoals: true,
      leanCanvas: true, valueProposition: true, impactModel: true,
      dreamConversation: { select: { fillStatus: true, openQuestions: true, updatedAt: true } },
    },
    }),
  ]);
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
    prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: slug, slug: "intervjuguide" } }, select: { slug: true, content: true } }),
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
  const work = await getPhaseWork(slug, "IDEA");
  const decisionDate = (d: Date) => d.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const interviewCount = interviews.length;

  // The steps of the phase, in #201's order, each with where it stands: done
  // (ticked, or detected from the data), an AI draft waiting for review,
  // started, or empty. The same list for a project started with AI or by hand.
  const [checked, autoDone] = await Promise.all([
    prisma.initiativeChecklistItem.findMany({ where: { projectId: project.id, completedAt: { not: null } }, select: { itemKey: true } }),
    getAutoDoneKeys(project.id, slug),
  ]);
  const doneKeys = new Set([...checked.map((c) => c.itemKey), ...autoDone]);
  // The kanban cards for each step (KanbanCard.phase/stepKey), for the
  // step's "☐ n uppgifter" in its title row.
  const stepCardRows = await prisma.kanbanCard.findMany({
    where: { projectSlug: slug, phase: { in: ["IDEA", "SPRINT"] }, stepKey: { not: null } },
    orderBy: [{ column: "asc" }, { order: "asc" }],
    select: { id: true, title: true, column: true, stepKey: true, assigneeId: true },
  });
  const assignees = await prisma.user.findMany({
    where: { id: { in: stepCardRows.map((c) => c.assigneeId).filter((x): x is string => !!x) } },
    select: { id: true, name: true, image: true },
  });
  const cardsByStep: Record<string, StepCard[]> = {};
  for (const c of stepCardRows) {
    const a = assignees.find((u) => u.id === c.assigneeId);
    (cardsByStep[c.stepKey!] ??= []).push({ id: c.id, title: c.title, column: c.column, assignee: a ? { name: a.name, image: a.image } : null });
  }
  const hasGuess = (prov: Record<string, { author?: string | null; status?: string | null } | undefined>) =>
    Object.values(prov).some((p) => p?.author === "AI" && p.status !== "VET");
  // Unanswered AI guesses win over "done": a step ticked off while the AI's
  // guesses in it are still waiting isn't really done yet.
  const stepStatus = (key: string, hasContent: boolean, guesses: boolean): PhaseStep["status"] =>
    doneKeys.has(key) ? "done" : guesses ? "review" : hasContent ? "started" : "empty";

  const fill = project.dreamConversation
    ? withStaleAsFailed(parseFillStatus(project.dreamConversation.fillStatus), project.dreamConversation.updatedAt)
    : {};
  const retry = (section: string) => (canEdit ? <RetryButton slug={slug} section={section} /> : null);
  const openQuestions = parseOpenQuestions(project.dreamConversation?.openQuestions);
  const writing = t("writing");
  // "Börja här" and the folded sections are for the team, once the AI has
  // filled the phase in from Drömsamtalet. Everyone else, a project started
  // by hand, or a fill still running sees every section open, as before.
  const canvases = [
    { entity: "leanCanvas", fields: LEAN_CANVAS_FIELDS, row: project.leanCanvas, prov: leanCanvasAi.provenance },
    { entity: "valueProposition", fields: VALUE_PROPOSITION_FIELDS, row: project.valueProposition, prov: valuePropositionAi.provenance },
    { entity: "impactModel", fields: IMPACT_MODEL_FIELDS, row: project.impactModel, prov: impactModelAi.provenance },
  ] as const;
  const filledCount = (c: (typeof canvases)[number]) =>
    c.fields.filter((f) => {
      const v = (c.row as Record<string, unknown> | null)?.[f];
      return typeof v === "string" && v.trim() !== "";
    }).length;
  const totalFilled = canvases.reduce((n, c) => n + filledCount(c), 0);
  const showStart = canEdit && !!project.dreamConversation && !isFillInProgress(fill) && totalFilled > 0;
  const provenanceByKey = Object.fromEntries(
    canvases.flatMap((c) => Object.entries(c.prov).map(([f, info]) => [`${c.entity}.${f}`, info])),
  );
  const topCritique = critique?.content.points.find((p) => p.severity === "high") ?? critique?.content.points[0] ?? null;
  const unanswered = pickGuesses(assumptions, provenanceByKey, topCritique?.field ?? null, assumptions.length);
  const canvasSummary = (entity: string) => {
    const c = canvases.find((x) => x.entity === entity)!;
    return t("foldedCanvas", { fields: filledCount(c), guesses: assumptions.filter((a) => a.key.startsWith(`${entity}.`)).length });
  };
  const fold = (summary: string) => (showStart ? { summary } : undefined);
  const critiqueBox = (critique || fill.critique === "pending" || fill.critique === "running" || (canEdit && aiAvailable && project.leanCanvas)) && (
    <CritiqueBox
      slug={slug}
      points={critique?.content.points ?? null}
      fieldLabels={fieldLabels}
      canEdit={canEdit && aiAvailable}
      writing={fill.critique === "pending" || fill.critique === "running"}
    />
  );

  const tSteps = await getTranslations({ locale, namespace: "ProjectPhaseChecklist" });
  const canvasRow = (e: string) => canvases.find((c) => c.entity === e)!;
  const steps: PhaseStep[] = ([
    { key: "dream_defined", anchor: "om", status: stepStatus("dream_defined", !!project.summary || !!project.description, hasGuess(projectProv)) },
    { key: "lean_canvas_created", anchor: "lean-canvas", status: stepStatus("lean_canvas_created", filledCount(canvasRow("leanCanvas")) > 0, hasGuess(leanCanvasAi.provenance)) },
    { key: "value_proposition_created", anchor: "vardeerbjudande", status: stepStatus("value_proposition_created", filledCount(canvasRow("valueProposition")) > 0, hasGuess(valuePropositionAi.provenance)) },
    { key: "impact_model_created", anchor: "impactmodell", status: stepStatus("impact_model_created", filledCount(canvasRow("impactModel")) > 0, hasGuess(impactModelAi.provenance)) },
    { key: "ai_reviewed", anchor: "mal", status: stepStatus("ai_reviewed", project.sdgGoals.length > 0, projectProv.sdgGoals?.author === "AI" && projectProv.sdgGoals?.status !== "VET") },
    { key: "target_audience_interviews", anchor: "intervjuer", status: stepStatus("target_audience_interviews", interviewCount > 0, false) },
    { key: "market_scan_partners", anchor: "omvarld", status: stepStatus("market_scan_partners", marketScan.length > 0, false) },
  ] as Omit<PhaseStep, "label">[]).map((st) => ({ ...st, label: tSteps(st.key as Parameters<typeof tSteps>[0]) }));
  if (inIdeaPhase) steps.push({ key: "gate", anchor: "fasgrind", status: lastDecision ? "done" : "empty", label: t("gateHeading") });

  const askStartTogether =
    canEdit &&
    !project.inviteQuestionDismissedAt &&
    (await prisma.projectMember.count({ where: { projectId: project.id, role: { not: "FOLLOWER" } } })) <= 1;

  // "Klar" under each step, for the team.
  const stepDone = (key: string) =>
    canEdit ? (
      <StepDone slug={slug} stepKey={key} done={doneKeys.has(key)} auto={!checked.some((c) => c.itemKey === key)} openCards={(cardsByStep[key] ?? []).filter((c) => c.column !== "DONE").length} />
    ) : null;

  // The AI buttons under "Om projektet" and "Globala mål" show only when the
  // user has AI on for that step.
  const [{ mode: aboutAiMode }, { mode: sdgAiMode }, { mode: interviewAiMode }, { mode: marketScanAiMode }] = aiAvailable
    ? await Promise.all([
        resolveAiMode({ projectId: project.id, feature: "dream-conversation", stepKey: "dream_defined" }),
        resolveAiMode({ projectId: project.id, feature: "sdg-suggestion", stepKey: "ai_reviewed" }),
        resolveAiMode({ projectId: project.id, feature: "dream-conversation", stepKey: "target_audience_interviews" }),
        resolveAiMode({ projectId: project.id, feature: "dream-conversation", stepKey: "market_scan_partners" }),
      ])
    : [{ mode: "MANUAL" as const }, { mode: "MANUAL" as const }, { mode: "MANUAL" as const }, { mode: "MANUAL" as const }];
  const marketScanConclusion = await prisma.marketScanConclusion.findUnique({ where: { projectSlug: slug } });
  const canvasRowForScan = (project.leanCanvas ?? {}) as Record<string, string | null>;

  return (
    <div data-phase-page className="flex flex-col gap-5 pt-3 pb-6">
      {/* Everything on the phase page reads at 64rem, except the big canvases
          ([data-wide]), which use the whole content width so their blocks get
          room — but only when open: folded into a row they line up with the
          rest. Direct children only, so StepMode's show/hide still works. */}
      <style data-keep>{`[data-phase-page] > * { width: 100%; max-width: 64rem; margin-inline: auto; } [data-phase-page] > [data-wide] { max-width: 110rem; } [data-phase-page] > [data-wide]:has(> section > button[aria-expanded="false"]) { max-width: 64rem; } [data-phase-page][data-view="steps"] [data-fold] { display: none; } [data-phase-page][data-aligned] > * { max-width: none; margin-inline: 0; margin-left: var(--align-left); width: var(--align-width); } [data-phase-page][data-aligned] > [data-wide] { margin-left: var(--wide-left); width: var(--wide-width); } [data-phase-page][data-aligned] > [data-wide]:has(> section > button[aria-expanded="false"]) { margin-left: var(--align-left); width: var(--align-width); }`}</style>
      {/* display: contents, so an empty strip adds no gap above the step. */}
      <div data-keep className="contents">
        <PhaseProgressStrip projectId={project.id} slug={slug} viewing="IDEA" />
        {isFillInProgress(fill) && <FillPoller />}
      </div>

      <div data-overview className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
          <p className="mt-1 text-sm text-dark-slate/60">{isFillInProgress(fill) ? t("introWriting") : t("intro")}</p>
        </div>
      </div>


      {showStart ? (
        <>
          <StartHere
            locale={locale}
            slug={slug}
            said={totalFilled - assumptions.length}
            guessed={assumptions.length}
            guesses={unanswered.slice(0, 3)}
            unansweredCount={unanswered.length}
            topCritique={topCritique?.text ?? null}
            fieldLabels={fieldLabels}
            interviewCount={interviewCount}
            hasInterviewGuide={!!interviewGuide}
          />
          <h2 className="mt-3 text-lg font-semibold text-dark-slate">{t("allHeading")}</h2>
          {critiqueBox && (
            <CollapsibleSection id="kritikern" title={t("critiqueHeading")} summary={t("foldedCritique", { count: critique?.content.points.length ?? 0 })}>
              {critiqueBox}
            </CollapsibleSection>
          )}
        </>
      ) : (
        critiqueBox
      )}

      <div data-step="dream_defined" className="flex flex-col gap-5">
      <OverviewSection id="om" introKey="about" after={<>{canEdit && aiAvailable && aboutAiMode !== "MANUAL" && <AboutAiDraft slug={slug} />}<StepActions>{stepDone("dream_defined")}</StepActions></>} title={t("aboutHeading")} fill={fill.about} writingLabel={writing} folded={fold(project.title)}>
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
            imageUrl: project.imageUrl,
          }}
        />
      </OverviewSection>
      {/* "Startar du projektet tillsammans med någon?" until a lead alone in
          the project has answered it (#201): only in this first step, under
          its own work, so it never takes the focus from the canvases. "Bjud
          in" by the project title is always there. */}
      {askStartTogether && <StartTogetherQuestion slug={slug} />}
      </div>

      <div data-step="lean_canvas_created" data-wide className="flex flex-col gap-5">
      <OverviewSection
        bare
        id="lean-canvas" introKey="leanCanvas"
        after={
          <StepActions>
            {leanCanvasAi.aiAvailable && (
              <CanvasAiBar below projectSlug={slug} entity="leanCanvas" stepKey={leanCanvasAi.stepKey} mode={leanCanvasAi.mode} canEdit={canEdit} />
            )}
            {stepDone("lean_canvas_created")}
          </StepActions>
        }
        title={t("leanCanvasHeading")}
        fill={fill.leanCanvas}
        writingLabel={writing}
        failedNote={<>{t("failedCanvas")}{retry("leanCanvas")}</>}
        folded={fold(canvasSummary("leanCanvas"))}
      >
        <CanvasIterateProvider enabled={canEdit && leanCanvasAi.aiAvailable && leanCanvasAi.mode !== "MANUAL"}>
          <LeanCanvasGrid
            projectSlug={slug}
            canvas={project.leanCanvas}
            canEdit={canEdit}
            provenance={leanCanvasAi.provenance}
            suggestions={leanCanvasAi.suggestions}
          />
        </CanvasIterateProvider>
      </OverviewSection>      </div>

      <div data-step="value_proposition_created" data-wide className="flex flex-col gap-5">
      <OverviewSection
        bare
        id="vardeerbjudande" introKey="valueProposition"
        after={
          <StepActions>
            {valuePropositionAi.aiAvailable && (
              <CanvasAiBar below projectSlug={slug} entity="valueProposition" stepKey={valuePropositionAi.stepKey} mode={valuePropositionAi.mode} canEdit={canEdit} />
            )}
            {stepDone("value_proposition_created")}
          </StepActions>
        }
        title={t("valuePropositionHeading")}
        fill={fill.valueProposition}
        writingLabel={writing}
        failedNote={<>{t("failedCanvas")}{retry("valueProposition")}</>}
        folded={fold(canvasSummary("valueProposition"))}
      >
        <CanvasIterateProvider enabled={canEdit && valuePropositionAi.aiAvailable && valuePropositionAi.mode !== "MANUAL"}>
          <ValuePropositionGrid
            projectSlug={slug}
            canvas={project.valueProposition}
            canEdit={canEdit}
            provenance={valuePropositionAi.provenance}
            suggestions={valuePropositionAi.suggestions}
          />
        </CanvasIterateProvider>
      </OverviewSection>
      </div>

      <div data-step="impact_model_created" data-wide className="flex flex-col gap-5">
      <OverviewSection
        bare
        id="impactmodell" introKey="impactModel"
        after={
          <StepActions>
            {impactModelAi.aiAvailable && (
              <CanvasAiBar below projectSlug={slug} entity="impactModel" stepKey={impactModelAi.stepKey} mode={impactModelAi.mode} canEdit={canEdit} />
            )}
            {stepDone("impact_model_created")}
          </StepActions>
        }
        title={t("impactModelHeading")}
        fill={fill.impactModel}
        writingLabel={writing}
        failedNote={<>{t("failedCanvas")}{retry("impactModel")}</>}
        folded={fold(canvasSummary("impactModel"))}
      >
        <CanvasIterateProvider enabled={canEdit && impactModelAi.aiAvailable && impactModelAi.mode !== "MANUAL"}>
          <ImpactModelChain
            projectSlug={slug}
            model={project.impactModel}
            canvasImpact={project.leanCanvas?.impact ?? null}
            legacyProblem={project.leanCanvas?.problem?.trim() || null}
            canEdit={canEdit}
            ai={impactModelAi}
            canvasAi={leanCanvasAi}
          />
        </CanvasIterateProvider>
      </OverviewSection>
      </div>

      <div data-step="ai_reviewed" className="flex flex-col gap-5">
      <OverviewSection id="mal" introKey="sdg" after={<>{canEdit && aiAvailable && sdgAiMode !== "MANUAL" && <SdgAiButton slug={slug} />}<StepActions>{stepDone("ai_reviewed")}</StepActions></>} title={t("sdgHeading")} fill={fill.about} writingLabel={writing} folded={fold(t("foldedSdg", { count: project.sdgGoals.length }))}>
        <SdgSection slug={slug} goals={project.sdgGoals} provenance={projectProv.sdgGoals} canEdit={canEdit} />
      </OverviewSection>
      </div>

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

      <div data-step="target_audience_interviews" className="flex flex-col gap-5">
      <OverviewSection
        id="intervjuer" introKey="interviews"
        after={<>{canEdit && aiAvailable && interviewAiMode !== "MANUAL" && <InterviewAiDraft slug={slug} hasGuide={!!interviewGuide} />}<StepActions>{stepDone("target_audience_interviews")}</StepActions></>}
        title={t("interviewsHeading")}
        fill={fill.interviewGuide === "skipped" ? undefined : fill.interviewGuide}
        writingLabel={t("writingInterviewGuide")}
        failedNote={<>{t("failedInterviewGuide")}{retry("interviewGuide")}</>}
      >
        <p className="text-sm text-dark-slate/70">{t("interviewsIntro")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link href={`/projects/${slug}/interviews`} className="rounded-lg bg-coral px-3 py-1.5 text-sm font-semibold text-white hover:bg-watermelon">
            {t("logInterviews")}
          </Link>
          <span className="text-sm text-dark-slate/60">{t("interviewCount", { count: interviewCount })}</span>
        </div>
        {/* The project's interview guide, open on the page — the questions to
            take into the interviews. It lives in the wiki, where it's edited. */}
        {interviewGuide && (
          <div className="mt-6 border-t border-dark-slate/10 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-dark-slate/45">{t("guideEyebrow")}</p>
                <p className="text-lg font-semibold text-dark-slate">{t("guideHeading")}</p>
              </div>
              {canEdit && (
                <Link href={`/projects/${slug}/wiki/intervjuguide`} className="rounded-full border border-dark-slate/15 px-3 py-1 text-sm font-medium text-dark-slate/60 hover:border-coral hover:text-coral">
                  {t("guideEdit")}
                </Link>
              )}
            </div>
            {/* Wiki content, sanitized here like every other stored HTML. */}
            <div
              className="prose prose-sm mt-3 max-w-none rounded-2xl border border-dark-slate/10 bg-dry-sage/5 p-5 text-dark-slate/85 prose-h2:mt-4 prose-h2:text-base prose-h2:first:mt-0 prose-em:text-[#9a5f00]"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(interviewGuide.content ?? "") }}
            />
          </div>
        )}
        {/* No guide yet: the template, for a team writing its own questions
            (#207). It saves as the guide. */}
        {!interviewGuide && (
          <InterviewTemplate
            slug={slug}
            canEdit={canEdit}
            customerSegments={project.leanCanvas?.customerSegments ?? null}
            assumptions={[...assumptions]
              .sort((a, b) => interviewPriority(a.key) - interviewPriority(b.key))
              .map((a) => ({ label: fieldLabels[a.key] ?? a.key, text: a.text }))}
          />
        )}
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
      </div>

      <div data-step="market_scan_partners" className="flex flex-col gap-5">
      <OverviewSection
        id="omvarld" introKey="marketScan"
        after={<StepActions>{stepDone("market_scan_partners")}</StepActions>}
        title={t("marketScanHeading")}
        fill={fill.marketScan === "skipped" ? undefined : fill.marketScan}
        writingLabel={t("writingMarketScan")}
        failedNote={<>{t("failedMarketScan")}{retry("marketScan")}</>}
        folded={fold(t("foldedMarketScan", { count: marketScan.length }))}
      >
        <MarketScanTemplate
          slug={slug}
          canEdit={canEdit}
          aiButton={canEdit && aiAvailable && marketScanAiMode !== "MANUAL"}
          canvas={Object.fromEntries(["customerSegments", "jobsToBeDone", "solution"].map((f) => [`leanCanvas.${f}`, canvasRowForScan[f] ?? null]))}
          fieldLabels={fieldLabels}
          entries={marketScan.map((e) => ({
            id: e.id, type: e.type, name: e.name, description: e.description, relevanceNote: e.relevanceNote,
            sourceUrl: e.sourceUrl, createdByAi: e.createdByAi, linkedField: e.linkedField, confirmedAt: e.confirmedAt?.toISOString() ?? null,
          }))}
          conclusion={marketScanConclusion ? { strengths: marketScanConclusion.strengths, gap: marketScanConclusion.gap, firstContacts: marketScanConclusion.firstContacts, createdByAi: marketScanConclusion.createdByAi } : null}
        />
      </OverviewSection>
      </div>

      <div data-step="gate">
      {inIdeaPhase ? (
        <OverviewSection id="fasgrind" introKey="gate" title={t("gateHeading")} writingLabel={writing}>
          <PhaseGateSection
            gate="idea"
            slug={slug}
            criteria={gate.criteria.map((c) => ({ ...c, label: criterionLabel(c.key) }))}
            countNote={{ key: "target_audience_interviews", text: tGate("interviewsOf", { count: gate.interviewCount }) }}
            brief={gateBrief?.content ?? null}
            lastDecision={
              lastDecision
                ? { outcome: lastDecision.outcome, date: decisionDate(lastDecision.createdAt), missing: lastDecision.missing.map(criterionLabel), openTaskCount: lastDecision.openTaskCount }
                : null
            }
            fieldLabels={fieldLabels}
            work={gateWork(work, criterionLabel)}
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
      <PhaseSteps steps={steps} initialView={view === "all" ? "all" : "steps"} slug={slug} cardsByStep={cardsByStep} canEdit={canEdit} />
    </div>
  );
}
