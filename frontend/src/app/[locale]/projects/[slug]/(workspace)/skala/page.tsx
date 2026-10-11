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
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { latestInsight } from "@/lib/ideaInsights";
import { skalaGateCriteria, type GateBrief } from "@/lib/phaseGate";
import { SKALA_STEPS, skalaStepsDone, type SkalaStep } from "@/lib/scaling";
import { parseCriteria } from "@/lib/pilot";
import { isSkalaFillInProgress, parseSkalaStatus, type SkalaFillStatus } from "@/lib/skalaFill";
import OverviewSection from "../ide/OverviewSection";
import PhaseSteps, { type PhaseStep } from "../ide/PhaseSteps";
import FillPoller from "../ide/FillPoller";
import PhaseGateSection from "../ide/PhaseGateSection";
import DraftButton from "../uppstart/DraftButton";
import PlanFields from "../uppstart/PlanFields";
import { saveScalingPlan } from "./actions";
import { GrowthPathPicker, SkalaAiHelp } from "./SkalaSteps";
import { DraftCta, FocusBox, GateClosed, WikiHtml } from "../_overview/parts";
import PhaseProgressStrip from "../../PhaseProgressStrip";

// Which section of this page each Skala step lives in (#331).
const STEP_ANCHOR: Record<SkalaStep, string> = {
  scaling_goals_set: "vilka-fler",
  scale_vs_fork_decided: "hur",
  core_defined: "karnan",
  local_teams_or_license: "forsta-platsen",
  expansion_capital_secured: "pengar",
};

// Skala (#331): reach more people, in a way that holds — one step at a time,
// like the earlier phases. Who else and where, how you grow (four ways),
// the core, the first new place (by the chosen way) and money to grow,
// then the gate. Everything a step needs is open on it.
export default async function SkalaOverviewPage({
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
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, phase: true, openForReplication: true } });
  if (!project) notFound();
  // A restart (#313) reopens this phase's gate: only decisions since then count.
  const restartAt = await lastRestartAt(project.id);

  const [t, tCheck, tGate, tUpp, canEdit, isFounder, aiConfigured, fillRow, focusBrief, focusDecision, done, plan, choice, instances, forkCount, metrics, evaluation, campaign, applications, cards, gate, gateBrief, gateDecision] =
    await Promise.all([
      getTranslations({ locale, namespace: "SkalaOverview" }),
      getTranslations({ locale, namespace: "ProjectPhaseChecklist" }),
      getTranslations({ locale, namespace: "PhaseGate" }),
      getTranslations({ locale, namespace: "UppstartOverview" }),
      hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES),
      hasProjectRole(project.id, session.user.id, ["FOUNDER"]),
      isAiProjectStartAvailable(session.user.id),
      prisma.phaseFill.findUnique({ where: { projectId_phase: { projectId: project.id, phase: "SCALE" } } }),
      latestInsight<GateBrief>(project.id, "ETABLERA_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, fromPhase: "ESTABLISH", outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
      prisma.initiativeChecklistItem.findMany({ where: { projectId: project.id, completedAt: { not: null } }, select: { itemKey: true } }),
      prisma.scalingPlan.findUnique({ where: { projectSlug: slug } }),
      prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: slug, slug: "skalningsval" } }, select: { content: true } }),
      prisma.projectInstance.findMany({ where: { parentSlug: slug }, orderBy: { createdAt: "asc" }, select: { id: true, region: true, country: true, status: true } }),
      prisma.project.count({ where: { forkedFromProjectId: project.id } }),
      prisma.impactMetric.findMany({ where: { projectSlug: slug }, orderBy: { createdAt: "asc" }, select: { id: true, label: true, unit: true } }),
      prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true } }),
      prisma.fundingCampaign.findUnique({ where: { projectId: project.id }, select: { id: true } }),
      prisma.fundingApplication.count({ where: { projectId: project.id } }),
      prisma.kanbanCard.findMany({
        where: { projectSlug: slug, phase: "SCALE", stepKey: { not: null } },
        orderBy: [{ column: "asc" }, { order: "asc" }],
        select: { id: true, title: true, column: true, stepKey: true, createdByAi: true },
      }),
      skalaGateCriteria(project.id, slug),
      latestInsight<GateBrief>(project.id, "SKALA_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, ...decidedSince(restartAt), fromPhase: "SCALE" }, orderBy: { createdAt: "desc" } }),
    ]);
  // AI only where the project uses it (#310), per step for the AI buttons.
  const aiAvailable = aiConfigured && (await resolveAiMode({ projectId: project.id, feature: "project-plan", phase: "SCALE" })).mode !== "MANUAL";
  const stepModes = aiConfigured
    ? await Promise.all(SKALA_STEPS.map((stepKey) => resolveAiMode({ projectId: project.id, feature: "project-plan", stepKey, phase: "SCALE" })))
    : [];
  const stepAi = (key: SkalaStep) => canEdit && aiConfigured && stepModes[SKALA_STEPS.indexOf(key)]?.mode !== "MANUAL";
  const fill: SkalaFillStatus = fillRow ? parseSkalaStatus(fillRow.status, fillRow.updatedAt) : {};
  const doneKeys = new Set(done.map((d) => d.itemKey));
  const notYet = ["IDEA", "SPRINT", "PILOT", "PRODUCTION", "ESTABLISH"].includes(project.phase);
  const writing = t("writing");
  const criterionLabel = (key: string) => tCheck(key as Parameters<typeof tCheck>[0]);
  const work = await getPhaseWork(slug, "SCALE");
  const decisionDate = (d: Date) => d.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const retry = (section: string) =>
    canEdit && aiAvailable ? (
      <>
        {" "}
        <DraftButton phase="skala" slug={slug} section={section} label={t("retry")} />
      </>
    ) : null;
  const toolLink = (href: string, label: string) => (
    <Link href={`/projects/${slug}/${href}`} className="text-sm font-semibold text-seagrass hover:underline">
      {label} →
    </Link>
  );

  const path = plan?.growthPath ?? null;
  const othersStart = path === "OTHERS" || path === "OPEN";
  const approvedInstances = instances.filter((i) => i.status === "approved").length;
  const shown = skalaStepsDone({ plan, replicationOpened: project.openForReplication || instances.length > 0, approvedInstance: approvedInstances > 0 });
  const steps: PhaseStep[] = SKALA_STEPS.map((key) => {
    const hasContent =
      key === "scaling_goals_set" ? !!(plan?.goals || plan?.geographies)
      : key === "scale_vs_fork_decided" ? !!choice
      : key === "core_defined" ? !!plan?.coreAdaptable
      : key === "local_teams_or_license" ? instances.length > 0
      : !!campaign || applications > 0;
    return { key, anchor: STEP_ANCHOR[key], label: criterionLabel(key), status: doneKeys.has(key) || shown[key] ? "done" : hasContent ? "started" : "empty" };
  });
  const inSkala = project.phase === "SCALE";
  if (inSkala) steps.push({ key: "gate", anchor: "fasgrind", status: gateDecision ? "done" : "empty", label: t("gateHeading") });

  const stepIntro = (text: string) => <p className="mb-4 text-center text-sm text-dark-slate/70">{text}</p>;
  const sub = (title: string) => <h3 className="mb-2 mt-6 border-t border-muted-teal/20 pt-4 text-base font-semibold text-dark-slate">{title}</h3>;
  const keyOf = (...v: (string | null | undefined)[]) => v.map((x) => x ?? "").join("|");
  const current = {
    goals: plan?.goals ?? null,
    geographies: plan?.geographies ?? null,
    coreFixed: plan?.coreFixed ?? null,
    coreAdaptable: plan?.coreAdaptable ?? null,
    teamOrLicenseModel: plan?.teamOrLicenseModel ?? null,
    capitalPlan: plan?.capitalPlan ?? null,
  };
  const stepTasks = (key: SkalaStep) => {
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
  const draftCta =
    !fillRow && canEdit && aiAvailable && !notYet ? (
      <DraftCta text={t("draftIntro")}>
        <DraftButton phase="skala" slug={slug} label={t("draftAll")} variant="primary" />
      </DraftCta>
    ) : null;
  const pilotCriteria = parseCriteria(evaluation?.successCriteria);
  // The first place's text follows the chosen way.
  const firstPlace = path === "HANDOVER" ? "Handover" : othersStart ? "Others" : "Self";

  return (
    <div data-phase-page className="flex flex-col gap-5 pt-3 pb-6">
      {/* Same layout rules as the earlier phase pages. */}
      <style data-keep>{`[data-phase-page] > * { width: 100%; max-width: 64rem; margin-inline: auto; } [data-phase-page][data-aligned] > * { max-width: none; margin-inline: 0; margin-left: var(--align-left); width: var(--align-width); }`}</style>
      <div data-keep className="contents">
        <PhaseProgressStrip projectId={project.id} slug={slug} viewing="SCALE" />
        {isSkalaFillInProgress(fill) && <FillPoller />}
      </div>
      {notYet && (
        <p data-keep className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("notYet")}{" "}
          <Link href={`/projects/${slug}/etablera?step=gate`} className="font-semibold underline underline-offset-2">
            {t("toGate")}
          </Link>
        </p>
      )}
      {isSkalaFillInProgress(fill) && (
        <p data-keep className="rounded-xl border border-seagrass/30 bg-seagrass/5 px-4 py-3 text-sm text-dark-slate/75">{t("introWriting")}</p>
      )}
      {draftCta && <div data-keep>{draftCta}</div>}
      {fill.tasks === "failed" && (
        <p data-keep className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("failed")}
          {retry("tasks")}
        </p>
      )}

      <div data-overview className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
          <p className="mt-1 text-sm text-dark-slate/60">{t("intro")}</p>
        </div>
      </div>

      <div data-step="scaling_goals_set" className="flex flex-col gap-5">
        <FocusBox heading={t("focusHeading")} items={focusBrief?.content.nextFocus ?? []} note={focusDecision?.note} />
        <OverviewSection id="vilka-fler" introKey="whoElse" title={criterionLabel("scaling_goals_set")} fill={fill.plan} writingLabel={writing} failedNote={<>{t("failed")}{retry("plan")}</>}>
          {stepIntro(t("goalsIntro"))}
          <PlanFields
            key={keyOf(plan?.goals, plan?.geographies)}
            slug={slug}
            canEdit={canEdit}
            save={saveScalingPlan}
            fields={[
              { key: "goals", label: t("goalsLabel"), value: plan?.goals ?? null, placeholder: t("goalsPlaceholder"), rows: 3 },
              { key: "geographies", label: t("whereLabel"), value: plan?.geographies ?? null, placeholder: t("wherePlaceholder"), rows: 3 },
            ]}
          />
          {stepTasks("scaling_goals_set")}
          {stepAi("scaling_goals_set") && !(plan?.goals?.trim() && plan?.geographies?.trim()) && <SkalaAiHelp slug={slug} kind="goals" current={current} />}
        </OverviewSection>
      </div>

      <div data-step="scale_vs_fork_decided" className="flex flex-col gap-5">
        <OverviewSection id="hur" introKey="howYouGrow" title={criterionLabel("scale_vs_fork_decided")} fill={fill.choice} writingLabel={writing} failedNote={<>{t("failed")}{retry("choice")}</>}>
          {stepIntro(t("pathIntro"))}
          <GrowthPathPicker slug={slug} value={path} canEdit={canEdit} />
          {choice?.content && (
            <div className="mt-6 rounded-xl border border-muted-teal/30 bg-dry-sage/10 p-4">
              <h3 className="mb-2 text-sm font-semibold text-dark-slate/70">{t("comparisonHeading")}</h3>
              <WikiHtml html={choice.content} />
            </div>
          )}
          {stepTasks("scale_vs_fork_decided")}
          {stepAi("scale_vs_fork_decided") && <SkalaAiHelp slug={slug} kind="choice" canKeep={!choice} />}
        </OverviewSection>
      </div>

      <div data-step="core_defined" className="flex flex-col gap-5">
        <OverviewSection id="karnan" introKey="theCore" title={criterionLabel("core_defined")} fill={fill.core} writingLabel={writing} failedNote={<>{t("failed")}{retry("core")}</>}>
          {stepIntro(t("coreIntro"))}
          <PlanFields
            key={keyOf(plan?.coreFixed, plan?.coreAdaptable)}
            slug={slug}
            canEdit={canEdit}
            save={saveScalingPlan}
            fields={[
              { key: "coreFixed", label: t("coreFixedLabel"), value: plan?.coreFixed ?? null, placeholder: t("coreFixedPlaceholder"), rows: 4 },
              { key: "coreAdaptable", label: t("coreAdaptableLabel"), value: plan?.coreAdaptable ?? null, placeholder: t("coreAdaptablePlaceholder"), rows: 4 },
            ]}
          />
          {sub(t("sameMetricsHeading"))}
          {metrics.length ? (
            <>
              <p className="mb-2 text-sm text-dark-slate/70">{t("sameMetricsIntro")}</p>
              <ul className="flex flex-wrap gap-2 text-sm">
                {metrics.map((m) => (
                  <li key={m.id} className="rounded-lg border border-muted-teal/30 px-3 py-1.5 text-dark-slate/80">
                    📏 {m.label} ({m.unit})
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-dark-slate/50">{t("noMetrics")}</p>
          )}
          {stepTasks("core_defined")}
          {stepAi("core_defined") && !(plan?.coreFixed?.trim() && plan?.coreAdaptable?.trim()) && <SkalaAiHelp slug={slug} kind="core" current={current} />}
        </OverviewSection>
      </div>

      <div data-step="local_teams_or_license" className="flex flex-col gap-5">
        <OverviewSection id="forsta-platsen" introKey="firstPlace" title={criterionLabel("local_teams_or_license")} writingLabel={writing}>
          {stepIntro(t(`firstPlaceIntro${firstPlace}`))}
          {!path && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("choosePathFirst")}</p>}
          <PlanFields
            key={keyOf(plan?.teamOrLicenseModel)}
            slug={slug}
            canEdit={canEdit}
            save={saveScalingPlan}
            fields={[{ key: "teamOrLicenseModel", label: t(`firstPlaceLabel${firstPlace}`), value: plan?.teamOrLicenseModel ?? null, placeholder: t(`firstPlacePlaceholder${firstPlace}`), rows: 5 }]}
          />
          {firstPlace === "Self" && pilotCriteria.length > 0 && (
            <div className="mt-4 rounded-xl border border-muted-teal/30 bg-dry-sage/10 p-4 text-sm">
              <p className="mb-1 font-semibold text-dark-slate/80">{t("pilotCriteriaHeading")}</p>
              <ul className="list-disc pl-5 text-dark-slate/75">{pilotCriteria.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}
          {(othersStart || instances.length > 0) && (
            <>
              {sub(t("groupsHeading"))}
              {instances.length ? (
                <ul className="mb-3 flex flex-col gap-2 text-sm">
                  {instances.map((i) => (
                    <li key={i.id} className="rounded-lg border border-muted-teal/30 px-3 py-2 text-dark-slate/80">
                      {i.region}
                      {i.country ? `, ${i.country}` : ""} · <span className="font-medium">{t(`instance_${i.status}`)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-3 text-sm text-dark-slate/50">{t("noInstances")}</p>
              )}
              {toolLink("scale", t("groupsManage"))}
            </>
          )}
          {(instances.length > 0 || forkCount > 0) && (
            <p className="mt-5 rounded-xl border border-seagrass/30 bg-seagrass/5 px-4 py-3 text-sm text-dark-slate/80">
              💚 {t("credit", { groups: instances.length, copies: forkCount })}
            </p>
          )}
          {stepTasks("local_teams_or_license")}
          {stepAi("local_teams_or_license") && !plan?.teamOrLicenseModel?.trim() && <SkalaAiHelp slug={slug} kind="firstPlace" current={current} />}
        </OverviewSection>
      </div>

      <div data-step="expansion_capital_secured" className="flex flex-col gap-5">
        <OverviewSection id="pengar" introKey="moneyToGrow" title={criterionLabel("expansion_capital_secured")} writingLabel={writing}>
          {stepIntro(t("capitalIntro"))}
          <PlanFields
            key={keyOf(plan?.capitalPlan)}
            slug={slug}
            canEdit={canEdit}
            save={saveScalingPlan}
            fields={[{ key: "capitalPlan", label: t("capitalLabel"), value: plan?.capitalPlan ?? null, placeholder: t("capitalPlaceholder"), rows: 4 }]}
          />
          <div className="mt-4 flex flex-wrap gap-4">
            {toolLink("funding", campaign ? t("campaignOpen") : t("campaignStart"))}
            {toolLink("funding-applications", t("fundingApply"))}
          </div>
          {stepTasks("expansion_capital_secured")}
          {stepAi("expansion_capital_secured") && !plan?.capitalPlan?.trim() && <SkalaAiHelp slug={slug} kind="capital" current={current} />}
        </OverviewSection>
      </div>

      {inSkala ? (
        <div data-step="gate">
          <OverviewSection id="fasgrind" introKey="skalaGate" title={t("gateHeading")} writingLabel={writing}>
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">{t("risksHeading")}</p>
              <ul className="mt-1 list-disc pl-5">
                <li>{t("risk1")}</li>
                <li>{t("risk2")}</li>
                <li>{t("risk3")}</li>
              </ul>
            </div>
            <PhaseGateSection
              gate="skala"
              slug={slug}
              criteria={gate.criteria.map((c) => ({ ...c, label: criterionLabel(c.key) }))}
              brief={gateBrief?.content ?? null}
              lastDecision={gateDecision ? { outcome: gateDecision.outcome, date: decisionDate(gateDecision.createdAt), missing: gateDecision.missing.map(criterionLabel), openTaskCount: gateDecision.openTaskCount } : null}
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
            <GateClosed text={tGate("skala.closed", { date: decisionDate(gateDecision.createdAt) })} href={`/projects/${slug}/impactfasen`} linkLabel={t("gateClosedLink")} />
          </div>
        )
      )}
      <PhaseSteps steps={steps} initialView={view === "all" ? "all" : "steps"} slug={slug} cardsByStep={{}} canEdit={false} />
    </div>
  );
}
