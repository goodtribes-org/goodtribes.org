import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { hasProjectRole, isRealMember, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { latestInsight } from "@/lib/ideaInsights";
import { lanseringGateCriteria, MIN_LOG_ENTRIES, type GateBrief } from "@/lib/phaseGate";
import { INITIATIVE_CHECKLIST_ITEMS } from "@/lib/projectPhase";
import { isLanseringFillInProgress, parseLanseringStatus, type LanseringFillStatus } from "@/lib/lanseringFill";
import OverviewSection from "../ide/OverviewSection";
import { DraftCta, FocusBox, GateClosed, OverviewHeader, TaskList, WikiHtml } from "../_overview/parts";
import DraftButton from "../uppstart/DraftButton";
import PilotSection from "./PilotSection";
import PhaseGateSection from "../ide/PhaseGateSection";

// Which section of this page each Lansering checklist step lives in.
const STEP_ANCHOR: Record<string, string> = {
  pilot_success_criteria: "pilot",
  pilot_executed_documented: "pilot",
  pilot_results_collected: "pilot",
  pilot_go_no_go: "fasgrind",
  launch_marketing_plan_created: "marknad",
  workflows_formalized: "arbetsfloden",
  impact_measurement_setup: "impact",
};


// Lansering on one page, same idea as Idé and Uppstart: what the AI
// drafted after the gate (pilot plan, impact metrics, launch plan,
// workflows, first tasks), and what only people can do — run the pilot,
// log what happens and judge the results.
export default async function LanseringOverviewPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [journeyOn, project] = await Promise.all([
    isFeatureEnabled("ai-project-start", session.user.id),
    prisma.project.findUnique({ where: { slug }, select: { id: true, phase: true } }),
  ]);
  if (!journeyOn) redirect(`/projects/${slug}/guide/production`);
  if (!project) notFound();

  const [t, tCheck, canEdit, canLog, aiAvailable, fillRow, brief, decision, done, evaluation, pilotPlan, workflows, metrics, launch, cards, openCardCount, tGate, isFounder, gate, gateBrief, gateDecision] =
    await Promise.all([
      getTranslations({ locale, namespace: "LanseringOverview" }),
      getTranslations({ locale, namespace: "ProjectPhaseChecklist" }),
      hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES),
      isRealMember(project.id, session.user.id),
      isAiProjectStartAvailable(session.user.id),
      prisma.phaseFill.findUnique({ where: { projectId_phase: { projectId: project.id, phase: "PRODUCTION" } } }),
      latestInsight<GateBrief>(project.id, "UPPSTART_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, fromPhase: "PILOT", outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
      prisma.initiativeChecklistItem.findMany({ where: { projectId: project.id, completedAt: { not: null } }, select: { itemKey: true } }),
      prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug } }),
      prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: slug, slug: "pilotplan" } }, select: { content: true } }),
      prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: slug, slug: "arbetsfloden" } }, select: { content: true } }),
      prisma.impactMetric.findMany({ where: { projectSlug: slug }, orderBy: { createdAt: "asc" }, select: { id: true, label: true, unit: true, targetValue: true, currentValue: true, description: true } }),
      prisma.launchPlan.findUnique({ where: { projectSlug: slug }, include: { channels: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, tactic: true } } } }),
      prisma.kanbanCard.findMany({
        where: { projectSlug: slug, column: { not: "DONE" } },
        orderBy: [{ createdAt: "desc" }],
        take: 8,
        select: { id: true, title: true, createdByAi: true },
      }),
      prisma.kanbanCard.count({ where: { projectSlug: slug, column: { not: "DONE" } } }),
      getTranslations({ locale, namespace: "PhaseGate" }),
      hasProjectRole(project.id, session.user.id, ["FOUNDER"]),
      lanseringGateCriteria(project.id, slug),
      latestInsight<GateBrief>(project.id, "LANSERING_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, fromPhase: "PRODUCTION" }, orderBy: { createdAt: "desc" } }),
    ]);
  const criterionLabel = (key: string) => tCheck(key as Parameters<typeof tCheck>[0]);
  const decisionDate = (d: Date) => d.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  const fill: LanseringFillStatus = fillRow ? parseLanseringStatus(fillRow.status, fillRow.updatedAt) : {};
  const doneKeys = new Set(done.map((d) => d.itemKey));
  const notYet = project.phase === "IDEA" || project.phase === "SPRINT" || project.phase === "PILOT";
  const writing = t("writing");
  const retry = (section: string) =>
    canEdit && aiAvailable ? (
      <>
        {" "}
        <DraftButton phase="lansering" slug={slug} section={section} label={t("retry")} />
      </>
    ) : null;
  const launchFields = [
    ["targetAudience", t("launchAudience")],
    ["positioning", t("launchPositioning")],
    ["budgetOverview", t("launchBudget")],
    ["successMetrics", t("launchMetrics")],
  ] as const;
  const editLink = (href: string) => (
    <Link href={`/projects/${slug}/${href}`} className="text-sm font-medium text-dark-slate/60 hover:text-coral">
      {canEdit ? t("edit") : t("open")}
    </Link>
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 py-6">
      <OverviewHeader
        heading={t("heading")}
        intro={isLanseringFillInProgress(fill) ? t("introWriting") : t("intro")}
        polling={isLanseringFillInProgress(fill)}
        stepByStep={{ href: `/projects/${slug}/guide/production`, label: t("stepByStep") }}
        notYet={notYet ? { text: t("notYet"), href: `/projects/${slug}/uppstart#fasgrind`, linkLabel: t("toGate") } : null}
        progressLabel={t("progressLabel")}
        steps={INITIATIVE_CHECKLIST_ITEMS.PRODUCTION.map((st) => ({
          key: st.key,
          label: tCheck(st.key as Parameters<typeof tCheck>[0]),
          done: doneKeys.has(st.key),
          anchor: STEP_ANCHOR[st.key] ?? "pilot",
        }))}
        draftCta={
          !fillRow && canEdit && aiAvailable && !notYet ? (
            <DraftCta text={t("draftIntro")}>
              <DraftButton phase="lansering" slug={slug} label={t("draftAll")} variant="primary" />
            </DraftCta>
          ) : null
        }
      />

      <FocusBox heading={t("focusHeading")} items={brief?.content.nextFocus ?? []} note={decision?.note} />

      <OverviewSection
        id="pilot"
        title={t("pilotHeading")}
        badge={t("yourTurn")}
        fill={fill.pilot}
        writingLabel={writing}
        failedNote={<>{t("failedPilot")}{retry("pilot")}</>}
        action={editLink("pilot-evaluation")}
      >
        <p className="mb-4 text-sm text-dark-slate/70">{t("pilotIntro")}</p>
        {pilotPlan?.content && (
          <details className="mb-5 rounded-xl border border-muted-teal/30 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-dark-slate">
              {t("pilotPlanHeading")}
              <Link href={`/projects/${slug}/wiki/pilotplan`} className="ml-3 text-xs font-medium text-dark-slate/50 hover:text-coral">
                {canEdit ? t("edit") : t("open")}
              </Link>
            </summary>
            <div className="mt-3">
              <WikiHtml html={pilotPlan.content} />
            </div>
          </details>
        )}
        <PilotSection
          slug={slug}
          successCriteria={evaluation?.successCriteria ?? null}
          log={evaluation?.executionNotes ?? null}
          results={evaluation?.resultsSummary ?? null}
          canLog={canLog}
          canEdit={canEdit}
          aiAvailable={aiAvailable}
        />
        <p className="mt-4 text-sm text-dark-slate/60">
          {t("decisionStatus")}: <span className="font-semibold text-dark-slate">{t(`decision_${evaluation?.decision ?? "PENDING"}`)}</span>
        </p>
      </OverviewSection>

      <OverviewSection
        id="impact"
        title={t("impactHeading")}
        fill={fill.impact}
        writingLabel={writing}
        failedNote={<>{t("failedImpact")}{retry("impact")}</>}
        action={editLink("impact")}
      >
        {metrics.length ? (
          <ul className="grid gap-2 md:grid-cols-2">
            {metrics.map((m) => (
              <li key={m.id} className="rounded-xl border border-muted-teal/30 p-3">
                <p className="font-semibold text-dark-slate">{m.label}</p>
                <p className="mt-1 text-sm text-dark-slate/80">
                  {m.targetValue
                    ? t("metricProgress", { current: m.currentValue, target: m.targetValue, unit: m.unit })
                    : t("metricCurrent", { current: m.currentValue, unit: m.unit })}
                </p>
                {m.description && <p className="mt-1 text-xs text-dark-slate/60">{m.description}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-dark-slate/50">{t("impactEmpty")}</p>
        )}
      </OverviewSection>

      <OverviewSection
        id="marknad"
        title={t("launchHeading")}
        fill={fill.launch}
        writingLabel={writing}
        failedNote={<>{t("failedLaunch")}{retry("launch")}</>}
        action={editLink("launch-plan")}
      >
        {launch && (launchFields.some(([f]) => launch[f]) || launch.channels.length) ? (
          <>
            <dl className="grid gap-4 md:grid-cols-2">
              {launchFields.map(([f, label]) => (
                <div key={f}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{label}</dt>
                  <dd className="mt-1 whitespace-pre-line text-sm text-dark-slate/80">{launch[f] || <span className="text-dark-slate/40">—</span>}</dd>
                </div>
              ))}
            </dl>
            {launch.channels.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{t("launchChannels")}</h3>
                <ul className="mt-1 flex flex-col gap-1 text-sm text-dark-slate/80">
                  {launch.channels.map((c) => (
                    <li key={c.id}>
                      <span className="font-medium text-dark-slate">{c.name}</span>
                      {c.tactic && <> — {c.tactic}</>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-dark-slate/50">{t("launchEmpty")}</p>
        )}
      </OverviewSection>

      <OverviewSection
        id="arbetsfloden"
        title={t("workflowsHeading")}
        fill={fill.workflows}
        writingLabel={writing}
        failedNote={<>{t("failedWorkflows")}{retry("workflows")}</>}
        action={workflows ? editLink("wiki/arbetsfloden") : undefined}
      >
        {workflows?.content ? (
          <WikiHtml html={workflows.content} />
        ) : (
          <p className="text-sm text-dark-slate/50">{t("workflowsEmpty")}</p>
        )}
      </OverviewSection>

      <OverviewSection
        id="uppgifter"
        title={t("tasksHeading")}
        fill={fill.tasks}
        writingLabel={writing}
        failedNote={<>{t("failedTasks")}{retry("tasks")}</>}
        action={
          <Link href={`/projects/${slug}/kanban`} className="text-sm font-medium text-dark-slate/60 hover:text-coral">
            {t("openBoard")}
          </Link>
        }
      >
        <TaskList cards={cards} total={openCardCount} aiDraftLabel={t("aiDraft")} moreLabel={(count) => t("moreTasks", { count })} emptyLabel={t("tasksEmpty")} />
      </OverviewSection>

      {project.phase === "PRODUCTION" ? (
        <OverviewSection id="fasgrind" title={t("gateHeading")} badge={t("yourTurn")} writingLabel={writing}>
          <PhaseGateSection
            gate="lansering"
            slug={slug}
            criteria={gate.criteria.map((c) => ({ ...c, label: criterionLabel(c.key) }))}
            countNote={{ key: "pilot_executed_documented", text: tGate("lansering.logOf", { count: gate.logCount, min: MIN_LOG_ENTRIES }) }}
            brief={gateBrief?.content ?? null}
            lastDecision={
              gateDecision
                ? { outcome: gateDecision.outcome, date: decisionDate(gateDecision.createdAt), missing: gateDecision.missing.map(criterionLabel) }
                : null
            }
            fieldLabels={{}}
            canEdit={canEdit}
            isFounder={isFounder}
            aiAvailable={aiAvailable}
          />
        </OverviewSection>
      ) : (
        gateDecision?.outcome === "CONTINUE" && (
          <GateClosed text={t("gateClosed", { date: decisionDate(gateDecision.createdAt) })} href={`/projects/${slug}/etablera`} linkLabel={t("gateClosedLink")} />
        )
      )}
    </div>
  );
}
