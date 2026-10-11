import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import { decidedSince, lastRestartAt } from "@/lib/phaseRestart";
import { resolveAiMode } from "@/lib/aiMode";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCanvasFieldLabels } from "@/lib/canvasFieldLabels";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPhaseWork, gateWork } from "@/lib/phaseWork";
import { Link } from "@/i18n/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { latestInsight } from "@/lib/ideaInsights";
import { uppstartGateCriteria, type GateBrief } from "@/lib/phaseGate";
import { MIN_MVP_TESTS, MVP_SIGNAL_ICON, MVP_SIGNALS, MVP_TYPES, UPPSTART_STEPS, uppstartStepsDone, type EvidenceStrength, type UppstartStep } from "@/lib/mvp";
import { isUppstartFillInProgress, parseUppstartStatus, type UppstartFillStatus } from "@/lib/uppstartFill";
import OverviewSection from "../ide/OverviewSection";
import { DraftCta, FieldGrid, FocusBox, GateClosed, OverviewHeader, TaskList } from "../_overview/parts";
import PlanFields from "./PlanFields";
import MvpTests from "./MvpTests";
import DraftButton from "./DraftButton";
import PhaseGateSection from "../ide/PhaseGateSection";
import PhaseProgressStrip from "../../PhaseProgressStrip";

// Which section of this page each Uppstart step lives in (#320).
const STEP_ANCHOR: Record<UppstartStep, string> = {
  mvp_hypothesis: "hypotes",
  mvp_built: "minsta-version",
  mvp_tested: "tester",
  pilot_planned: "pilot",
};

const STRENGTH_STYLE: Record<EvidenceStrength, string> = {
  none: "border-muted-teal/30 bg-white text-dark-slate/70",
  weak: "border-amber-200 bg-amber-50 text-amber-800",
  some: "border-seagrass/30 bg-seagrass/5 text-dark-slate/80",
  strong: "border-seagrass/50 bg-seagrass/10 text-dark-slate",
};

// Uppstart on one page (#320): test whether anyone wants it, fast. What we
// test, the smallest version, the people who tried it (with how strong a
// signal each gave) and the plan for the pilot — then the decision. The
// gate says how strong the evidence is and encourages paying customers; it
// never stops a team that wants to go on.
export default async function UppstartOverviewPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  await notFoundUnlessVisible(slug);
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  // The phase page for every project (#309); only its AI parts need AI.
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, phase: true, title: true } });
  if (!project) notFound();
  // A restart (#313) reopens this phase's gate: only decisions since then count.
  const restartAt = await lastRestartAt(project.id);

  const [t, tCheck, canEdit, aiConfigured, fillRow, brief, decision, done, tests, evaluation, cards, openCardCount, plan, tGate, fieldLabels, isFounder, gate, gateBrief, gateDecision] =
    await Promise.all([
      getTranslations({ locale, namespace: "UppstartOverview" }),
      getTranslations({ locale, namespace: "ProjectPhaseChecklist" }),
      hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES),
      isAiProjectStartAvailable(session.user.id),
      prisma.phaseFill.findUnique({ where: { projectId_phase: { projectId: project.id, phase: "PILOT" } } }),
      latestInsight<GateBrief>(project.id, "PHASE_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, fromPhase: { in: ["IDEA", "SPRINT"] }, outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
      prisma.initiativeChecklistItem.findMany({ where: { projectId: project.id, completedAt: { not: null } }, select: { itemKey: true } }),
      prisma.mvpTest.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "asc" }, select: { id: true, who: true, happened: true, signal: true } }),
      prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true } }),
      // This phase's own open cards (#312); earlier phases' leftovers show in the gate.
      prisma.kanbanCard.findMany({
        where: { projectSlug: slug, phase: "PILOT", column: { not: "DONE" } },
        orderBy: [{ createdAt: "desc" }],
        take: 8,
        select: { id: true, title: true, createdByAi: true },
      }),
      prisma.kanbanCard.count({ where: { projectSlug: slug, phase: "PILOT", column: { not: "DONE" } } }),
      prisma.projectPlan.findUnique({ where: { projectSlug: slug } }),
      getTranslations({ locale, namespace: "PhaseGate" }),
      getCanvasFieldLabels(locale),
      hasProjectRole(project.id, session.user.id, ["FOUNDER"]),
      uppstartGateCriteria(project.id, slug),
      latestInsight<GateBrief>(project.id, "UPPSTART_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, ...decidedSince(restartAt), fromPhase: "PILOT" }, orderBy: { createdAt: "desc" } }),
    ]);
  // AI only where the project uses it (#310): a project or phase set to
  // MANUAL sees no AI buttons and no claims that the AI drafted anything.
  const aiAvailable = aiConfigured && (await resolveAiMode({ projectId: project.id, feature: "project-plan", phase: "PILOT" })).mode !== "MANUAL";

  const fill: UppstartFillStatus = fillRow ? parseUppstartStatus(fillRow.status, fillRow.updatedAt) : {};
  const doneKeys = new Set(done.map((d) => d.itemKey));
  const shown = uppstartStepsDone(plan, tests.length, evaluation?.successCriteria);
  const stillInIdea = project.phase === "IDEA" || project.phase === "SPRINT";
  const writing = t("writing");
  const retry = (section: string) => (canEdit && aiAvailable ? <> <DraftButton slug={slug} section={section} label={t("retry")} /></> : null);
  const criterionLabel = (key: string) => tCheck(key as Parameters<typeof tCheck>[0]);
  const work = await getPhaseWork(slug, "PILOT");
  const decisionDate = (d: Date) => d.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const evidence = gate.evidence;
  const evidenceBox = (
    <div className={`rounded-xl border px-4 py-3 text-sm ${STRENGTH_STYLE[evidence.strength]}`}>
      {evidence.total > 0 && (
        <p className="mb-1 font-medium">
          {t("evidenceCount", { count: evidence.total })}{" "}
          {MVP_SIGNALS.map((s) => `${MVP_SIGNAL_ICON[s]} ${evidence.counts[s]}`).join(" · ")}
        </p>
      )}
      <p>{t(`evidence_${evidence.strength}`)}</p>
    </div>
  );
  // Remount the editors when the saved text changes (an AI draft landing),
  // so a form opened on empty fields never saves blanks over it.
  const keyOf = (...v: (string | null | undefined)[]) => v.map((x) => x ?? "").join("|");
  const oldPlan = [
    ["goal", t("planGoal")],
    ["milestones", t("planMilestones")],
    ["resources", t("planResources")],
    ["risks", t("planRisks")],
  ] as const;
  const hasOldPlan = oldPlan.some(([f]) => plan?.[f]?.trim());

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 py-6">
      <PhaseProgressStrip projectId={project.id} slug={slug} viewing="PILOT" />
      <OverviewHeader
        heading={t("heading")}
        intro={isUppstartFillInProgress(fill) ? t("introWriting") : fillRow && aiAvailable ? `${t("intro")} ${t("introAi")}` : t("intro")}
        polling={isUppstartFillInProgress(fill)}
        stepByStep={{ href: `/projects/${slug}/guide/pilot`, label: t("stepByStep") }}
        notYet={stillInIdea ? { text: t("stillInIdea"), href: `/projects/${slug}/ide#fasgrind`, linkLabel: t("toGate") } : null}
        progressLabel={t("progressLabel")}
        steps={UPPSTART_STEPS.map((key) => ({ key, label: criterionLabel(key), done: doneKeys.has(key) || shown[key], anchor: STEP_ANCHOR[key] }))}
        draftCta={
          !fillRow && canEdit && aiAvailable && !stillInIdea ? (
            <DraftCta text={t("draftIntro")}>
              <DraftButton slug={slug} label={t("draftAll")} variant="primary" />
            </DraftCta>
          ) : null
        }
      />

      <FocusBox heading={t("focusHeading")} items={brief?.content.nextFocus ?? []} note={decision?.note} />

      <OverviewSection id="hypotes" title={`1. ${criterionLabel("mvp_hypothesis")}`} fill={fill.mvp} writingLabel={writing} failedNote={<>{t("failedMvp")}{retry("mvp")}</>}>
        <p className="mb-3 text-sm text-dark-slate/70">{t("hypothesisIntro")}</p>
        <PlanFields
          key={keyOf(plan?.hypothesis)}
          slug={slug}
          canEdit={canEdit}
          fields={[{ key: "hypothesis", label: t("hypothesisLabel"), value: plan?.hypothesis ?? null, placeholder: t("hypothesisPlaceholder"), rows: 3 }]}
        />
      </OverviewSection>

      <OverviewSection id="minsta-version" title={`2. ${criterionLabel("mvp_built")}`} fill={fill.mvp} writingLabel={writing} failedNote={<>{t("failedMvp")}{retry("mvp")}</>}>
        <p className="mb-3 text-sm text-dark-slate/70">{t("mvpIntro")}</p>
        <PlanFields
          key={keyOf(plan?.mvpType, plan?.mvpDescription)}
          slug={slug}
          canEdit={canEdit}
          fields={[
            { key: "mvpType", label: t("mvpTypeLabel"), value: plan?.mvpType ?? null, options: MVP_TYPES.map((m) => ({ value: m, label: t(`mvpType_${m}`), hint: t(`mvpTypeHint_${m}`) })) },
            { key: "mvpDescription", label: t("mvpDescriptionLabel"), value: plan?.mvpDescription ?? null, placeholder: t("mvpDescriptionPlaceholder"), rows: 3 },
          ]}
        />
      </OverviewSection>

      <OverviewSection id="tester" title={`3. ${criterionLabel("mvp_tested")}`} writingLabel={writing}>
        <p className="mb-3 text-sm text-dark-slate/70">{t("testsIntro", { min: MIN_MVP_TESTS })}</p>
        <div className="mb-4">{evidenceBox}</div>
        <MvpTests slug={slug} tests={tests} canEdit={canEdit} />
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

      <OverviewSection id="pilot" title={`4. ${criterionLabel("pilot_planned")}`} fill={fill.plan} writingLabel={writing} failedNote={<>{t("failedPlan")}{retry("plan")}</>}>
        <p className="mb-3 text-sm text-dark-slate/70">{t("pilotIntro")}</p>
        <PlanFields
          key={keyOf(plan?.pilotWhere, plan?.pilotWho, plan?.pilotDuration, plan?.pilotTeam, plan?.pilotBudget, evaluation?.successCriteria)}
          slug={slug}
          canEdit={canEdit}
          fields={[
            { key: "pilotWhere", label: t("pilotWhereLabel"), value: plan?.pilotWhere ?? null, placeholder: t("pilotWherePlaceholder") },
            { key: "pilotWho", label: t("pilotWhoLabel"), value: plan?.pilotWho ?? null, placeholder: t("pilotWhoPlaceholder") },
            { key: "pilotDuration", label: t("pilotDurationLabel"), value: plan?.pilotDuration ?? null, placeholder: t("pilotDurationPlaceholder"), rows: 1 },
            { key: "successCriteria", label: t("successCriteriaLabel"), value: evaluation?.successCriteria ?? null, placeholder: t("successCriteriaPlaceholder"), rows: 3 },
            { key: "pilotTeam", label: t("pilotTeamLabel"), value: plan?.pilotTeam ?? null, placeholder: t("pilotTeamPlaceholder") },
            { key: "pilotBudget", label: t("pilotBudgetLabel"), value: plan?.pilotBudget ?? null, placeholder: t("pilotBudgetPlaceholder") },
          ]}
        />
        {hasOldPlan && (
          <details className="mt-5 border-t border-muted-teal/20 pt-4">
            <summary className="cursor-pointer text-sm font-medium text-dark-slate/60">{t("oldPlanHeading")}</summary>
            <div className="mt-3">
              <FieldGrid empty="" fields={oldPlan.map(([f, label]) => ({ key: f, label, value: plan?.[f] }))} />
            </div>
          </details>
        )}
      </OverviewSection>

      {project.phase === "PILOT" ? (
        <OverviewSection id="fasgrind" title={t("gateHeading")} badge={t("yourTurn")} writingLabel={writing}>
          <div className="mb-5">{evidenceBox}</div>
          <PhaseGateSection
            gate="uppstart"
            slug={slug}
            criteria={gate.criteria.map((c) => ({ ...c, label: criterionLabel(c.key) }))}
            countNote={{ key: "mvp_tested", text: tGate("uppstart.testsOf", { count: evidence.total, min: MIN_MVP_TESTS }) }}
            brief={gateBrief?.content ?? null}
            lastDecision={
              gateDecision
                ? { outcome: gateDecision.outcome, date: decisionDate(gateDecision.createdAt), missing: gateDecision.missing.map(criterionLabel), openTaskCount: gateDecision.openTaskCount }
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
        gateDecision?.outcome === "CONTINUE" && (
          <GateClosed text={t("gateClosed", { date: decisionDate(gateDecision.createdAt) })} href={`/projects/${slug}/lansering`} linkLabel={t("gateClosedLink")} />
        )
      )}
    </div>
  );
}
