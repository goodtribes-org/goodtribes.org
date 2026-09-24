import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { latestInsight } from "@/lib/ideaInsights";
import { skalaGateCriteria, type GateBrief } from "@/lib/phaseGate";
import { INITIATIVE_CHECKLIST_ITEMS } from "@/lib/projectPhase";
import { isSkalaFillInProgress, parseSkalaStatus, type SkalaFillStatus } from "@/lib/skalaFill";
import OverviewSection from "../ide/OverviewSection";
import PhaseGateSection from "../ide/PhaseGateSection";
import DraftButton from "../uppstart/DraftButton";
import { DraftCta, FieldGrid, FocusBox, GateClosed, OverviewHeader, TaskList, WikiHtml } from "../_overview/parts";

const STEP_ANCHOR: Record<string, string> = {
  scale_vs_fork_decided: "val",
  scaling_goals_set: "plan",
  new_geographies_identified: "plan",
  expansion_capital_secured: "plan",
  local_teams_or_license: "natverk",
};

// Skala on one page: the AI's draft scaling plan and its assessment of how
// to scale (grow, open for replication, or fork), the real network of
// regional instances, first tasks — and the gate to Impact.
export default async function SkalaOverviewPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [journeyOn, project] = await Promise.all([
    isFeatureEnabled("ai-project-start", session.user.id),
    prisma.project.findUnique({ where: { slug }, select: { id: true, phase: true, openForReplication: true } }),
  ]);
  if (!journeyOn) redirect(`/projects/${slug}/guide/scale`);
  if (!project) notFound();

  const [t, tCheck, tGate, canEdit, isFounder, aiAvailable, fillRow, focusBrief, focusDecision, done, plan, choice, instances, forkCount, cards, openCardCount, gate, gateBrief, gateDecision] =
    await Promise.all([
      getTranslations({ locale, namespace: "SkalaOverview" }),
      getTranslations({ locale, namespace: "ProjectPhaseChecklist" }),
      getTranslations({ locale, namespace: "PhaseGate" }),
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
      prisma.kanbanCard.findMany({
        where: { projectSlug: slug, column: { not: "DONE" } },
        orderBy: [{ createdAt: "desc" }],
        take: 8,
        select: { id: true, title: true, createdByAi: true },
      }),
      prisma.kanbanCard.count({ where: { projectSlug: slug, column: { not: "DONE" } } }),
      skalaGateCriteria(project.id, slug),
      latestInsight<GateBrief>(project.id, "SKALA_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, fromPhase: "SCALE" }, orderBy: { createdAt: "desc" } }),
    ]);

  const fill: SkalaFillStatus = fillRow ? parseSkalaStatus(fillRow.status, fillRow.updatedAt) : {};
  const doneKeys = new Set(done.map((d) => d.itemKey));
  const notYet = ["IDEA", "SPRINT", "PILOT", "PRODUCTION", "ESTABLISH"].includes(project.phase);
  const writing = t("writing");
  const criterionLabel = (key: string) => tCheck(key as Parameters<typeof tCheck>[0]);
  const decisionDate = (d: Date) => d.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const retry = (section: string) =>
    canEdit && aiAvailable ? (
      <>
        {" "}
        <DraftButton phase="skala" slug={slug} section={section} label={t("retry")} />
      </>
    ) : null;
  const link = (href: string, label: string) => (
    <Link href={`/projects/${slug}/${href}`} className="text-sm font-medium text-dark-slate/60 hover:text-coral">
      {label}
    </Link>
  );
  const editOrOpen = canEdit ? t("edit") : t("open");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 py-6">
      <OverviewHeader
        heading={t("heading")}
        intro={isSkalaFillInProgress(fill) ? t("introWriting") : t("intro")}
        polling={isSkalaFillInProgress(fill)}
        stepByStep={{ href: `/projects/${slug}/guide/scale`, label: t("stepByStep") }}
        notYet={notYet ? { text: t("notYet"), href: `/projects/${slug}/etablera#fasgrind`, linkLabel: t("toGate") } : null}
        progressLabel={t("progressLabel")}
        steps={INITIATIVE_CHECKLIST_ITEMS.SCALE.map((s) => ({ key: s.key, label: criterionLabel(s.key), done: doneKeys.has(s.key), anchor: STEP_ANCHOR[s.key] ?? "plan" }))}
        draftCta={
          !fillRow && canEdit && aiAvailable && !notYet ? (
            <DraftCta text={t("draftIntro")}>
              <DraftButton phase="skala" slug={slug} label={t("draftAll")} variant="primary" />
            </DraftCta>
          ) : null
        }
      />

      <FocusBox heading={t("focusHeading")} items={focusBrief?.content.nextFocus ?? []} note={focusDecision?.note} />

      <OverviewSection id="val" title={t("choiceHeading")} badge={t("yourTurn")} fill={fill.choice} writingLabel={writing} failedNote={<>{t("failed")}{retry("choice")}</>} action={link("scale", t("decideHere"))}>
        <p className="mb-3 text-sm text-dark-slate/70">{t("choiceIntro")}</p>
        {choice?.content ? <WikiHtml html={choice.content} /> : <p className="text-sm text-dark-slate/50">{t("empty")}</p>}
      </OverviewSection>

      <OverviewSection id="plan" title={t("planHeading")} fill={fill.plan} writingLabel={writing} failedNote={<>{t("failed")}{retry("plan")}</>} action={link("scaling-plan", editOrOpen)}>
        <FieldGrid
          empty={t("empty")}
          fields={[
            { key: "goals", label: t("planGoals"), value: plan?.goals },
            { key: "geographies", label: t("planGeographies"), value: plan?.geographies },
            { key: "capitalPlan", label: t("planCapital"), value: plan?.capitalPlan },
            { key: "teamOrLicenseModel", label: t("planTeam"), value: plan?.teamOrLicenseModel },
          ]}
        />
      </OverviewSection>

      <OverviewSection id="natverk" title={t("networkHeading")} badge={t("yourTurn")} writingLabel={writing} action={link("scale", t("manage"))}>
        <p className="text-sm text-dark-slate/70">
          {project.openForReplication ? t("replicationOpen") : t("replicationClosed")} {t("forkCount", { count: forkCount })}
        </p>
        {instances.length ? (
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {instances.map((i) => (
              <li key={i.id} className="rounded-lg border border-muted-teal/30 px-3 py-1.5 text-dark-slate/75">
                {i.region}
                {i.country ? `, ${i.country}` : ""} · {t(`instance_${i.status}`)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-dark-slate/50">{t("noInstances")}</p>
        )}
      </OverviewSection>

      <OverviewSection id="uppgifter" title={t("tasksHeading")} fill={fill.tasks} writingLabel={writing} failedNote={<>{t("failed")}{retry("tasks")}</>} action={link("kanban", t("openBoard"))}>
        <TaskList cards={cards} total={openCardCount} aiDraftLabel={t("aiDraft")} moreLabel={(count) => t("moreTasks", { count })} emptyLabel={t("tasksEmpty")} />
      </OverviewSection>

      {project.phase === "SCALE" ? (
        <OverviewSection id="fasgrind" title={t("gateHeading")} badge={t("yourTurn")} writingLabel={writing}>
          <PhaseGateSection
            gate="skala"
            slug={slug}
            criteria={gate.criteria.map((c) => ({ ...c, label: criterionLabel(c.key) }))}
            brief={gateBrief?.content ?? null}
            lastDecision={gateDecision ? { outcome: gateDecision.outcome, date: decisionDate(gateDecision.createdAt), missing: gateDecision.missing.map(criterionLabel) } : null}
            fieldLabels={{}}
            canEdit={canEdit}
            isFounder={isFounder}
            aiAvailable={aiAvailable}
          />
        </OverviewSection>
      ) : (
        gateDecision?.outcome === "CONTINUE" && (
          <GateClosed text={tGate("skala.closed", { date: decisionDate(gateDecision.createdAt) })} href={`/projects/${slug}/impactfasen`} linkLabel={t("gateClosedLink")} />
        )
      )}
    </div>
  );
}
