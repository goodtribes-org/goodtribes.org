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
import { DraftCta, FieldGrid, FocusBox, GateClosed } from "../_overview/parts";
import PhaseSteps, { type PhaseStep } from "../ide/PhaseSteps";
import FillPoller from "../ide/FillPoller";
import PlanFields from "./PlanFields";
import HypothesisFields from "./HypothesisFields";
import { draftText } from "@/lib/aiLanguage";
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

// Uppstart (#320): test whether anyone wants it, fast. What we test, the
// smallest version, the people who tried it (with how strong a signal each
// gave) and the plan for the pilot — then the decision. One step at a time,
// like the Idé page. The
// gate says how strong the evidence is and encourages paying customers; it
// never stops a team that wants to go on.
export default async function UppstartOverviewPage({
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
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, phase: true, title: true, contentLocale: true } });
  if (!project) notFound();
  // A restart (#313) reopens this phase's gate: only decisions since then count.
  const restartAt = await lastRestartAt(project.id);

  const [t, tCheck, canEdit, aiConfigured, fillRow, brief, decision, done, tests, evaluation, cards, plan, tGate, fieldLabels, isFounder, gate, gateBrief, gateDecision] =
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
      // This phase's cards (#312), shown under the step they're work for.
      prisma.kanbanCard.findMany({
        where: { projectSlug: slug, phase: "PILOT", stepKey: { not: null } },
        orderBy: [{ column: "asc" }, { order: "asc" }],
        select: { id: true, title: true, column: true, stepKey: true, createdByAi: true },
      }),
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

  // One step at a time, as in Idé (#206): the header's Uppstart bar is the
  // stepper (?step=<key>), PhaseSteps shows the step in focus. Everything a
  // step needs is open on it — the forms, the tests, its tasks — so nothing
  // has to be unfolded to see what to do.
  const steps: PhaseStep[] = UPPSTART_STEPS.map((key) => {
    const hasContent =
      key === "mvp_hypothesis" ? !!plan?.hypothesis?.trim()
      : key === "mvp_built" ? !!plan?.mvpType || !!plan?.mvpDescription?.trim()
      : key === "mvp_tested" ? tests.length > 0
      : !!(plan?.pilotWhere || plan?.pilotWho || plan?.pilotDuration || evaluation?.successCriteria);
    const status: PhaseStep["status"] = doneKeys.has(key) || shown[key] ? "done" : hasContent ? "started" : "empty";
    return { key, anchor: STEP_ANCHOR[key], status, label: criterionLabel(key) };
  });
  const inUppstart = project.phase === "PILOT";
  if (inUppstart) steps.push({ key: "gate", anchor: "fasgrind", status: gateDecision ? "done" : "empty", label: t("gateHeading") });
  const stepTasks = (key: UppstartStep) => {
    const mine = cards.filter((c) => c.stepKey === key);
    const open = mine.filter((c) => c.column !== "DONE");
    if (!mine.length) return null;
    return (
      <div className="mt-6 border-t border-muted-teal/20 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-dark-slate">{t("stepTasksHeading")}</h3>
          <Link href={`/projects/${slug}/kanban`} className="text-xs font-medium text-dark-slate/50 hover:text-coral">
            {t("openBoard")}
          </Link>
        </div>
        {open.length ? (
          <ul className="flex flex-col divide-y divide-muted-teal/15">
            {open.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm text-dark-slate/80">
                <span>☐ {c.title}</span>
                {c.createdByAi && aiAvailable && <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-seagrass">{t("aiDraft")}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-seagrass">✓ {t("stepTasksDone")}</p>
        )}
      </div>
    );
  };
  // The words around the three fields, in the project's language.
  const { hypWe, hypWant, hypKnow } = draftText(project.contentLocale);
  const hypothesisWords = { hypWe, hypWant, hypKnow };
  const stepIntro = (text: string) => <p className="mb-4 text-center text-sm text-dark-slate/70">{text}</p>;
  const draftCta =
    !fillRow && canEdit && aiAvailable && !stillInIdea ? (
      <DraftCta text={t("draftIntro")}>
        <DraftButton slug={slug} label={t("draftAll")} variant="primary" />
      </DraftCta>
    ) : null;

  return (
    <div data-phase-page className="flex flex-col gap-5 pt-3 pb-6">
      {/* Same layout rules as the Idé page: 64rem, lined up with the
          header's phase menu once PhaseSteps has measured it. */}
      <style data-keep>{`[data-phase-page] > * { width: 100%; max-width: 64rem; margin-inline: auto; } [data-phase-page][data-aligned] > * { max-width: none; margin-inline: 0; margin-left: var(--align-left); width: var(--align-width); }`}</style>
      <div data-keep className="contents">
        <PhaseProgressStrip projectId={project.id} slug={slug} viewing="PILOT" />
        {isUppstartFillInProgress(fill) && <FillPoller />}
      </div>
      {stillInIdea && (
        <p data-keep className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("stillInIdea")}{" "}
          <Link href={`/projects/${slug}/ide?step=gate`} className="font-semibold underline underline-offset-2">
            {t("toGate")}
          </Link>
        </p>
      )}
      {isUppstartFillInProgress(fill) && (
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
          <p className="mt-1 text-sm text-dark-slate/60">{fillRow && aiAvailable ? `${t("intro")} ${t("introAi")}` : t("intro")}</p>
        </div>
      </div>

      <div data-step="mvp_hypothesis" className="flex flex-col gap-5">
        <FocusBox heading={t("focusHeading")} items={brief?.content.nextFocus ?? []} note={decision?.note} />
        <OverviewSection id="hypotes" introKey="mvpHypothesis" title={criterionLabel("mvp_hypothesis")} fill={fill.mvp} writingLabel={writing} failedNote={<>{t("failedMvp")}{retry("mvp")}</>}>
          {stepIntro(t("hypothesisIntro"))}
          <HypothesisFields key={keyOf(plan?.hypothesis)} slug={slug} value={plan?.hypothesis ?? null} words={hypothesisWords} canEdit={canEdit} />
          {stepTasks("mvp_hypothesis")}
        </OverviewSection>
      </div>

      <div data-step="mvp_built" className="flex flex-col gap-5">
        <OverviewSection id="minsta-version" introKey="mvpBuilt" title={criterionLabel("mvp_built")} fill={fill.mvp} writingLabel={writing} failedNote={<>{t("failedMvp")}{retry("mvp")}</>}>
          {stepIntro(t("mvpIntro"))}
          <PlanFields
            key={keyOf(plan?.mvpType, plan?.mvpDescription)}
            slug={slug}
            canEdit={canEdit}
            fields={[
              { key: "mvpType", label: t("mvpTypeLabel"), value: plan?.mvpType ?? null, options: MVP_TYPES.map((m) => ({ value: m, label: t(`mvpType_${m}`), hint: t(`mvpTypeHint_${m}`) })) },
              { key: "mvpDescription", label: t("mvpDescriptionLabel"), value: plan?.mvpDescription ?? null, placeholder: t("mvpDescriptionPlaceholder"), rows: 3 },
            ]}
          />
          {stepTasks("mvp_built")}
        </OverviewSection>
      </div>

      <div data-step="mvp_tested" className="flex flex-col gap-5">
        <OverviewSection id="tester" introKey="mvpTested" title={criterionLabel("mvp_tested")} writingLabel={writing}>
          {stepIntro(t("testsIntro", { min: MIN_MVP_TESTS }))}
          <div className="mb-4">{evidenceBox}</div>
          <MvpTests slug={slug} tests={tests} canEdit={canEdit} />
          {stepTasks("mvp_tested")}
        </OverviewSection>
      </div>

      <div data-step="pilot_planned" className="flex flex-col gap-5">
        <OverviewSection id="pilot" introKey="pilotPlanned" title={criterionLabel("pilot_planned")} fill={fill.plan} writingLabel={writing} failedNote={<>{t("failedPlan")}{retry("plan")}</>}>
          {stepIntro(t("pilotIntro"))}
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
          {stepTasks("pilot_planned")}
          {hasOldPlan && (
            <details className="mt-5 border-t border-muted-teal/20 pt-4">
              <summary className="cursor-pointer text-sm font-medium text-dark-slate/60">{t("oldPlanHeading")}</summary>
              <div className="mt-3">
                <FieldGrid empty="" fields={oldPlan.map(([f, label]) => ({ key: f, label, value: plan?.[f] }))} />
              </div>
            </details>
          )}
        </OverviewSection>
      </div>

      {inUppstart ? (
        <div data-step="gate">
          <OverviewSection id="fasgrind" introKey="uppstartGate" title={t("gateHeading")} writingLabel={writing}>
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
        </div>
      ) : (
        gateDecision?.outcome === "CONTINUE" && (
          <div data-keep>
            <GateClosed text={t("gateClosed", { date: decisionDate(gateDecision.createdAt) })} href={`/projects/${slug}/lansering`} linkLabel={t("gateClosedLink")} />
          </div>
        )
      )}
      {/* No dropdown of cards in the title row: each step lists its own tasks, open. */}
      <PhaseSteps steps={steps} initialView={view === "all" ? "all" : "steps"} slug={slug} cardsByStep={{}} canEdit={false} />
    </div>
  );
}
