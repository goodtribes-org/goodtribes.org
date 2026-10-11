import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import { decidedSince, lastRestartAt } from "@/lib/phaseRestart";
import { resolveAiMode } from "@/lib/aiMode";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPhaseWork, gateWork } from "@/lib/phaseWork";
import { Link } from "@/i18n/navigation";
import { hasProjectRole, isRealMember, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { latestInsight } from "@/lib/ideaInsights";
import { lanseringGateCriteria, MIN_LOG_ENTRIES, type GateBrief } from "@/lib/phaseGate";
import { LANSERING_STEPS, lanseringStepsDone, logEntries, OUTCOME_ICON, OUTCOMES, parseCriteria, resultsFor, type LanseringStep } from "@/lib/pilot";
import { isLanseringFillInProgress, parseLanseringStatus, type LanseringFillStatus } from "@/lib/lanseringFill";
import OverviewSection from "../ide/OverviewSection";
import PhaseSteps, { type PhaseStep } from "../ide/PhaseSteps";
import FillPoller from "../ide/FillPoller";
import { DraftCta, FieldGrid, FocusBox, GateClosed } from "../_overview/parts";
import DraftButton from "../uppstart/DraftButton";
import PlanFields from "../uppstart/PlanFields";
import PhaseGateSection from "../ide/PhaseGateSection";
import PhaseProgressStrip from "../../PhaseProgressStrip";
import { saveResultsSummary, savePlanForward } from "./actions";
import { CriteriaMetrics, CriteriaOutcomes, LanseringAiHelp, MetricReports, PilotLog, PilotStartDate, type CriterionView, type MetricView } from "./LanseringSteps";

// Which section of this page each Lansering step lives in (#327).
const STEP_ANCHOR: Record<LanseringStep, string> = {
  pilot_success_criteria: "starta",
  pilot_executed_documented: "folj",
  pilot_results_collected: "resultat",
  launch_marketing_plan_created: "framat",
};

// Lansering (#327): run the pilot, learn and decide — one step at a time,
// like Idé and Uppstart. Start the pilot (the plan from Uppstart, a metric
// per success criterion, a start date), follow it (the log, the metrics),
// what it showed (an outcome per criterion) and the plan forward, then the
// gate. Everything a step needs is open on it.
export default async function LanseringOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { locale, slug } = await params;
  const { view } = await searchParams;
  await notFoundUnlessVisible(slug);
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  // The phase page for every project (#309); only its AI parts need AI.
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, phase: true } });
  if (!project) notFound();
  // A restart (#313) reopens this phase's gate: only decisions since then count.
  const restartAt = await lastRestartAt(project.id);

  const [t, tCheck, tUpp, canEdit, isMember, aiConfigured, fillRow, brief, decision, done, evaluation, plan, metricRows, launch, cards, tGate, isFounder, gate, gateBrief, gateDecision] =
    await Promise.all([
      getTranslations({ locale, namespace: "LanseringOverview" }),
      getTranslations({ locale, namespace: "ProjectPhaseChecklist" }),
      getTranslations({ locale, namespace: "UppstartOverview" }),
      hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES),
      isRealMember(project.id, session.user.id),
      isAiProjectStartAvailable(session.user.id),
      prisma.phaseFill.findUnique({ where: { projectId_phase: { projectId: project.id, phase: "PRODUCTION" } } }),
      latestInsight<GateBrief>(project.id, "UPPSTART_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, fromPhase: "PILOT", outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
      prisma.initiativeChecklistItem.findMany({ where: { projectId: project.id, completedAt: { not: null } }, select: { itemKey: true } }),
      prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug } }),
      prisma.projectPlan.findUnique({ where: { projectSlug: slug }, select: { pilotWhere: true, pilotWho: true, pilotDuration: true, pilotTeam: true, pilotBudget: true } }),
      prisma.impactMetric.findMany({
        where: { projectSlug: slug },
        orderBy: { createdAt: "asc" },
        select: { id: true, label: true, unit: true, targetValue: true, currentValue: true, _count: { select: { updates: true } } },
      }),
      prisma.launchPlan.findUnique({ where: { projectSlug: slug }, select: { targetAudience: true, howToReach: true, budgetOverview: true, whoPays: true, positioning: true, successMetrics: true } }),
      // This phase's cards, shown under the step they're work for.
      prisma.kanbanCard.findMany({
        where: { projectSlug: slug, phase: "PRODUCTION", stepKey: { not: null } },
        orderBy: [{ column: "asc" }, { order: "asc" }],
        select: { id: true, title: true, column: true, stepKey: true, createdByAi: true },
      }),
      getTranslations({ locale, namespace: "PhaseGate" }),
      hasProjectRole(project.id, session.user.id, ["FOUNDER"]),
      lanseringGateCriteria(project.id, slug),
      latestInsight<GateBrief>(project.id, "LANSERING_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, ...decidedSince(restartAt), fromPhase: "PRODUCTION" }, orderBy: { createdAt: "desc" } }),
    ]);
  // AI only where the project uses it (#310), per step for the AI buttons.
  const aiAvailable = aiConfigured && (await resolveAiMode({ projectId: project.id, feature: "project-plan", phase: "PRODUCTION" })).mode !== "MANUAL";
  const stepModes = aiConfigured
    ? await Promise.all(LANSERING_STEPS.map((stepKey) => resolveAiMode({ projectId: project.id, feature: "project-plan", stepKey, phase: "PRODUCTION" })))
    : [];
  const stepAi = (key: LanseringStep) => canEdit && aiConfigured && stepModes[LANSERING_STEPS.indexOf(key)]?.mode !== "MANUAL";
  const criterionLabel = (key: string) => tCheck(key as Parameters<typeof tCheck>[0]);
  const work = await getPhaseWork(slug, "PRODUCTION");
  const decisionDate = (d: Date) => d.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  const fill: LanseringFillStatus = fillRow ? parseLanseringStatus(fillRow.status, fillRow.updatedAt) : {};
  const doneKeys = new Set(done.map((d) => d.itemKey));
  const shown = lanseringStepsDone({ evaluation, launch });
  const notYet = project.phase === "IDEA" || project.phase === "SPRINT" || project.phase === "PILOT";
  const writing = t("writing");
  const retry = (section: string) =>
    canEdit && aiAvailable ? (
      <>
        {" "}
        <DraftButton phase="lansering" slug={slug} section={section} label={t("retry")} />
      </>
    ) : null;

  const metrics: MetricView[] = metricRows.map((m) => ({ id: m.id, label: m.label, unit: m.unit, targetValue: m.targetValue, currentValue: m.currentValue, updates: m._count.updates }));
  const results = resultsFor(parseCriteria(evaluation?.successCriteria), evaluation?.criteriaResults);
  const criteria: CriterionView[] = results.map((r) => ({
    criterion: r.criterion,
    metric: metrics.find((m) => m.id === r.metricId) ?? null,
    outcome: r.outcome ?? null,
    note: r.note ?? null,
  }));
  const counts = gate.outcomes;
  const outcomeBox = criteria.length > 0 && (
    <div className="rounded-xl border border-muted-teal/30 bg-dry-sage/15 px-4 py-3 text-sm text-dark-slate/80">
      <p className="font-medium text-dark-slate">
        {t("outcomeSummary", { assessed: counts.assessed, total: counts.total })}{" "}
        {OUTCOMES.map((o) => `${OUTCOME_ICON[o]} ${counts[o]}`).join(" · ")}
      </p>
      {counts.assessed < counts.total && <p className="mt-1">{t("outcomeSummaryOpen")}</p>}
    </div>
  );

  const steps: PhaseStep[] = LANSERING_STEPS.map((key) => {
    const hasContent =
      key === "pilot_success_criteria" ? !!evaluation?.startedAt || criteria.some((c) => c.metric)
      : key === "pilot_executed_documented" ? logEntries(evaluation?.executionNotes) > 0
      : key === "pilot_results_collected" ? criteria.some((c) => c.outcome) || !!evaluation?.resultsSummary?.trim()
      : !!(launch?.targetAudience || launch?.howToReach || launch?.budgetOverview || launch?.whoPays);
    return { key, anchor: STEP_ANCHOR[key], label: criterionLabel(key), status: doneKeys.has(key) || shown[key] ? "done" : hasContent ? "started" : "empty" };
  });
  const inLansering = project.phase === "PRODUCTION";
  if (inLansering) steps.push({ key: "gate", anchor: "fasgrind", status: gateDecision ? "done" : "empty", label: t("gateHeading") });

  const stepTasks = (key: LanseringStep) => {
    const mine = cards.filter((c) => c.stepKey === key);
    const open = mine.filter((c) => c.column !== "DONE");
    if (!mine.length) return null;
    return (
      <div className="mt-6 border-t border-muted-teal/20 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-dark-slate">{tUpp("stepTasksHeading")}</h3>
          <Link href={`/projects/${slug}/kanban`} className="text-xs font-medium text-dark-slate/50 hover:text-coral">
            {tUpp("openBoard")}
          </Link>
        </div>
        {open.length ? (
          <ul className="flex flex-col divide-y divide-muted-teal/15">
            {open.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm text-dark-slate/80">
                <span>☐ {c.title}</span>
                {c.createdByAi && aiAvailable && <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-seagrass">{tUpp("aiDraft")}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-seagrass">✓ {tUpp("stepTasksDone")}</p>
        )}
      </div>
    );
  };
  const stepIntro = (text: string) => <p className="mb-4 text-center text-sm text-dark-slate/70">{text}</p>;
  const sub = (title: string) => <h3 className="mb-2 mt-6 border-t border-muted-teal/20 pt-4 text-base font-semibold text-dark-slate">{title}</h3>;
  const keyOf = (...v: (string | null | undefined)[]) => v.map((x) => x ?? "").join("|");
  const startDate = evaluation?.startedAt ? evaluation.startedAt.toISOString().slice(0, 10) : null;
  const draftCta =
    !fillRow && canEdit && aiAvailable && !notYet ? (
      <DraftCta text={t("draftIntro")}>
        <DraftButton phase="lansering" slug={slug} label={t("draftAll")} variant="primary" />
      </DraftCta>
    ) : null;
  const oldLaunch = [
    ["positioning", t("launchPositioning")],
    ["successMetrics", t("launchMetrics")],
  ] as const;
  const hasOldLaunch = oldLaunch.some(([f]) => launch?.[f]?.trim());

  return (
    <div data-phase-page className="flex flex-col gap-5 pt-3 pb-6">
      {/* Same layout rules as the Idé and Uppstart pages. */}
      <style data-keep>{`[data-phase-page] > * { width: 100%; max-width: 64rem; margin-inline: auto; } [data-phase-page][data-aligned] > * { max-width: none; margin-inline: 0; margin-left: var(--align-left); width: var(--align-width); }`}</style>
      <div data-keep className="contents">
        <PhaseProgressStrip projectId={project.id} slug={slug} viewing="PRODUCTION" />
        {isLanseringFillInProgress(fill) && <FillPoller />}
      </div>
      {notYet && (
        <p data-keep className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("notYet")}{" "}
          <Link href={`/projects/${slug}/uppstart?step=gate`} className="font-semibold underline underline-offset-2">
            {t("toGate")}
          </Link>
        </p>
      )}
      {isLanseringFillInProgress(fill) && (
        <p data-keep className="rounded-xl border border-seagrass/30 bg-seagrass/5 px-4 py-3 text-sm text-dark-slate/75">{t("introWriting")}</p>
      )}
      {draftCta && <div data-keep>{draftCta}</div>}
      {fill.tasks === "failed" && (
        <p data-keep className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("failedTasks")}
          {retry("tasks")}
        </p>
      )}

      <div data-overview className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
          <p className="mt-1 text-sm text-dark-slate/60">{t("intro")}</p>
        </div>
      </div>

      <div data-step="pilot_success_criteria" className="flex flex-col gap-5">
        <FocusBox heading={t("focusHeading")} items={brief?.content.nextFocus ?? []} note={decision?.note} />
        <OverviewSection id="starta" introKey="pilotStart" title={criterionLabel("pilot_success_criteria")} fill={fill.metrics} writingLabel={writing} failedNote={<>{t("failedMetrics")}{retry("metrics")}</>}>
          {stepIntro(t("startIntro"))}
          <h3 className="mb-2 text-base font-semibold text-dark-slate">{t("planHeading")}</h3>
          <PlanFields
            key={keyOf(plan?.pilotWhere, plan?.pilotWho, plan?.pilotDuration, plan?.pilotTeam, plan?.pilotBudget, evaluation?.successCriteria)}
            slug={slug}
            canEdit={canEdit}
            fields={[
              { key: "pilotWhere", label: tUpp("pilotWhereLabel"), value: plan?.pilotWhere ?? null, placeholder: tUpp("pilotWherePlaceholder") },
              { key: "pilotWho", label: tUpp("pilotWhoLabel"), value: plan?.pilotWho ?? null, placeholder: tUpp("pilotWhoPlaceholder") },
              { key: "pilotDuration", label: tUpp("pilotDurationLabel"), value: plan?.pilotDuration ?? null, placeholder: tUpp("pilotDurationPlaceholder"), rows: 1 },
              { key: "successCriteria", label: tUpp("successCriteriaLabel"), value: evaluation?.successCriteria ?? null, placeholder: tUpp("successCriteriaPlaceholder"), rows: 3 },
              { key: "pilotTeam", label: tUpp("pilotTeamLabel"), value: plan?.pilotTeam ?? null, placeholder: tUpp("pilotTeamPlaceholder") },
              { key: "pilotBudget", label: tUpp("pilotBudgetLabel"), value: plan?.pilotBudget ?? null, placeholder: tUpp("pilotBudgetPlaceholder") },
            ]}
          />
          {sub(t("measureHeading"))}
          <p className="mb-2 text-sm text-dark-slate/70">{t("measureIntro")}</p>
          {criteria.length ? (
            <CriteriaMetrics slug={slug} criteria={criteria} canEdit={canEdit} aiHelp={stepAi("pilot_success_criteria")} />
          ) : (
            <p className="text-sm text-dark-slate/50">{t("noCriteria")}</p>
          )}
          {sub(t("startDateHeading"))}
          <PilotStartDate key={startDate ?? ""} slug={slug} value={startDate} canEdit={canEdit} />
          {stepTasks("pilot_success_criteria")}
        </OverviewSection>
      </div>

      <div data-step="pilot_executed_documented" className="flex flex-col gap-5">
        <OverviewSection id="folj" introKey="pilotFollow" title={criterionLabel("pilot_executed_documented")} writingLabel={writing}>
          {stepIntro(t("followIntro", { min: MIN_LOG_ENTRIES }))}
          <h3 className="mb-2 text-base font-semibold text-dark-slate">{t("logHeading")}</h3>
          <PilotLog slug={slug} log={evaluation?.executionNotes ?? null} canLog={isMember} />
          {sub(t("metricsHeading"))}
          <MetricReports slug={slug} metrics={metrics} canReport={isMember} />
          {stepTasks("pilot_executed_documented")}
        </OverviewSection>
      </div>

      <div data-step="pilot_results_collected" className="flex flex-col gap-5">
        <OverviewSection id="resultat" introKey="pilotResults" title={criterionLabel("pilot_results_collected")} writingLabel={writing}>
          {stepIntro(t("resultsIntro"))}
          {outcomeBox && <div className="mb-2">{outcomeBox}</div>}
          {criteria.length ? <CriteriaOutcomes slug={slug} criteria={criteria} canEdit={canEdit} /> : <p className="text-sm text-dark-slate/50">{t("noCriteria")}</p>}
          {sub(t("summaryHeading"))}
          <PlanFields
            key={keyOf(evaluation?.resultsSummary)}
            slug={slug}
            canEdit={canEdit}
            save={saveResultsSummary}
            fields={[{ key: "resultsSummary", label: t("summaryLabel"), value: evaluation?.resultsSummary ?? null, placeholder: t("summaryPlaceholder"), rows: 5 }]}
          />
          {stepTasks("pilot_results_collected")}
          {stepAi("pilot_results_collected") && logEntries(evaluation?.executionNotes) > 0 && (
            <LanseringAiHelp slug={slug} kind="results" current={{ resultsSummary: evaluation?.resultsSummary ?? null }} />
          )}
        </OverviewSection>
      </div>

      <div data-step="launch_marketing_plan_created" className="flex flex-col gap-5">
        <OverviewSection id="framat" introKey="planForward" title={criterionLabel("launch_marketing_plan_created")} fill={fill.plan} writingLabel={writing} failedNote={<>{t("failedPlan")}{retry("plan")}</>}>
          {stepIntro(t("planForwardIntro"))}
          <PlanFields
            key={keyOf(launch?.targetAudience, launch?.howToReach, launch?.budgetOverview, launch?.whoPays)}
            slug={slug}
            canEdit={canEdit}
            save={savePlanForward}
            fields={[
              { key: "targetAudience", label: t("planWhoLabel"), value: launch?.targetAudience ?? null, placeholder: t("planWhoPlaceholder") },
              { key: "howToReach", label: t("planHowLabel"), value: launch?.howToReach ?? null, placeholder: t("planHowPlaceholder") },
              { key: "budgetOverview", label: t("planCostLabel"), value: launch?.budgetOverview ?? null, placeholder: t("planCostPlaceholder") },
              { key: "whoPays", label: t("planPaysLabel"), value: launch?.whoPays ?? null, placeholder: t("planPaysPlaceholder") },
            ]}
          />
          {hasOldLaunch && (
            <details className="mt-5 border-t border-muted-teal/20 pt-4">
              <summary className="cursor-pointer text-sm font-medium text-dark-slate/60">{t("oldLaunchHeading")}</summary>
              <div className="mt-3">
                <FieldGrid empty="" fields={oldLaunch.map(([f, label]) => ({ key: f, label, value: launch?.[f] }))} />
              </div>
            </details>
          )}
          {stepTasks("launch_marketing_plan_created")}
          {stepAi("launch_marketing_plan_created") && (
            <LanseringAiHelp
              slug={slug}
              kind="plan"
              current={{ targetAudience: launch?.targetAudience ?? null, howToReach: launch?.howToReach ?? null, budgetOverview: launch?.budgetOverview ?? null, whoPays: launch?.whoPays ?? null }}
            />
          )}
        </OverviewSection>
      </div>

      {inLansering ? (
        <div data-step="gate">
          <OverviewSection id="fasgrind" introKey="lanseringGate" title={t("gateHeading")} writingLabel={writing}>
            {outcomeBox && <div className="mb-5">{outcomeBox}</div>}
            <PhaseGateSection
              gate="lansering"
              slug={slug}
              criteria={gate.criteria.map((c) => ({ ...c, label: criterionLabel(c.key) }))}
              countNote={{ key: "pilot_executed_documented", text: tGate("lansering.logOf", { count: gate.logCount, min: MIN_LOG_ENTRIES }) }}
              brief={gateBrief?.content ?? null}
              lastDecision={
                gateDecision
                  ? { outcome: gateDecision.outcome, date: decisionDate(gateDecision.createdAt), missing: gateDecision.missing.map(criterionLabel), openTaskCount: gateDecision.openTaskCount }
                  : null
              }
              fieldLabels={{}}
              work={gateWork(work, criterionLabel)}
              canEdit={canEdit}
              isFounder={isFounder}
              aiAvailable={aiAvailable}
            />
          </OverviewSection>
        </div>
      ) : (
        gateDecision?.outcome === "CONTINUE" && (
          <div data-keep>
            <GateClosed text={t("gateClosed", { date: decisionDate(gateDecision.createdAt) })} href={`/projects/${slug}/etablera`} linkLabel={t("gateClosedLink")} />
          </div>
        )
      )}
      <PhaseSteps steps={steps} initialView={view === "all" ? "all" : "steps"} slug={slug} cardsByStep={{}} canEdit={false} />
    </div>
  );
}
