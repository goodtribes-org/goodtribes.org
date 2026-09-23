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
import type { GateBrief } from "@/lib/phaseGate";
import { INITIATIVE_CHECKLIST_ITEMS } from "@/lib/projectPhase";
import { impactStepsDone, isImpactFillInProgress, parseImpactStatus, type ImpactFillStatus, type NextStepBrief, type NextStepOption } from "@/lib/impactPhaseFill";
import OverviewSection from "../ide/OverviewSection";
import DraftButton from "../uppstart/DraftButton";
import { DraftCta, FieldGrid, FocusBox, OverviewHeader, TaskList, WikiHtml } from "../_overview/parts";
import NextStepSection from "./NextStepSection";

const STEP_ANCHOR: Record<string, string> = {
  sdg_impact_measured: "resultat",
  impact_externally_verified: "verifiering",
  results_celebrated: "fira",
  next_step_decided: "nasta-steg",
};

const DECISION_OPTION: Record<string, NextStepOption | null> = { UNDECIDED: null, CONTINUE: "continue", REPLICATE: "replicate", CLOSE_RESPONSIBLY: "close" };

// Impact, the last phase, on one page: the reported and verified impact
// (with the AI's summary — figures as reported, never summed), plans for
// external verification and for celebrating, and the final decision.
export default async function ImpactOverviewPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isFeatureEnabled("ai-project-start", session.user.id))) redirect(`/projects/${slug}/guide/impact`);

  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, phase: true } });
  if (!project) notFound();

  const [t, tCheck, canEdit, isFounder, aiAvailable, fillRow, focusBrief, focusDecision, doneKeys, metrics, reports, summary, followup, nextBrief, cards, openCardCount] = await Promise.all([
    getTranslations({ locale, namespace: "ImpactOverview" }),
    getTranslations({ locale, namespace: "ProjectPhaseChecklist" }),
    hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES),
    hasProjectRole(project.id, session.user.id, ["FOUNDER"]),
    isAiProjectStartAvailable(session.user.id),
    prisma.phaseFill.findUnique({ where: { projectId_phase: { projectId: project.id, phase: "IMPACT" } } }),
    latestInsight<GateBrief>(project.id, "SKALA_GATE"),
    prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, fromPhase: "SCALE", outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
    impactStepsDone(project.id, slug),
    prisma.impactMetric.findMany({ where: { projectSlug: slug }, orderBy: { createdAt: "asc" }, select: { id: true, label: true, unit: true, currentValue: true, targetValue: true, _count: { select: { updates: true } } } }),
    prisma.impactReport.findMany({ where: { projectId: project.id }, select: { verifiedAt: true, rejectedAt: true } }),
    prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: slug, slug: "impactsammanfattning" } }, select: { content: true } }),
    prisma.impactFollowup.findUnique({ where: { projectSlug: slug } }),
    latestInsight<NextStepBrief>(project.id, "IMPACT_NEXT_STEP"),
    prisma.kanbanCard.findMany({
      where: { projectSlug: slug, column: { not: "DONE" } },
      orderBy: [{ createdAt: "desc" }],
      take: 8,
      select: { id: true, title: true, createdByAi: true },
    }),
    prisma.kanbanCard.count({ where: { projectSlug: slug, column: { not: "DONE" } } }),
  ]);

  const fill: ImpactFillStatus = fillRow ? parseImpactStatus(fillRow.status, fillRow.updatedAt) : {};
  const notYet = project.phase !== "IMPACT";
  const writing = t("writing");
  const verified = reports.filter((r) => r.verifiedAt).length;
  const pending = reports.filter((r) => !r.verifiedAt && !r.rejectedAt).length;
  const retry = (section: string) =>
    canEdit && aiAvailable ? (
      <>
        {" "}
        <DraftButton phase="impact" slug={slug} section={section} label={t("retry")} />
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
        intro={isImpactFillInProgress(fill) ? t("introWriting") : t("intro")}
        polling={isImpactFillInProgress(fill)}
        stepByStep={{ href: `/projects/${slug}/guide/impact`, label: t("stepByStep") }}
        notYet={notYet ? { text: t("notYet"), href: `/projects/${slug}/skala#fasgrind`, linkLabel: t("toGate") } : null}
        progressLabel={t("progressLabel")}
        steps={INITIATIVE_CHECKLIST_ITEMS.IMPACT.map((s) => ({
          key: s.key,
          label: tCheck(s.key as Parameters<typeof tCheck>[0]),
          done: doneKeys.has(s.key),
          anchor: STEP_ANCHOR[s.key] ?? "resultat",
        }))}
        draftCta={
          !fillRow && canEdit && aiAvailable && !notYet ? (
            <DraftCta text={t("draftIntro")}>
              <DraftButton phase="impact" slug={slug} label={t("draftAll")} variant="primary" />
            </DraftCta>
          ) : null
        }
      />

      <FocusBox heading={t("focusHeading")} items={focusBrief?.content.nextFocus ?? []} note={focusDecision?.note} />

      <OverviewSection id="resultat" title={t("resultsHeading")} fill={fill.summary} writingLabel={writing} failedNote={<>{t("failed")}{retry("summary")}</>} action={link("impact", t("report"))}>
        {metrics.length > 0 && (
          <ul className="mb-4 grid gap-2 md:grid-cols-2">
            {metrics.map((m) => (
              <li key={m.id} className="rounded-xl border border-muted-teal/30 p-3 text-sm">
                <p className="font-semibold text-dark-slate">{m.label}</p>
                <p className="mt-1 text-dark-slate/80">
                  {m._count.updates
                    ? m.targetValue
                      ? t("metricProgress", { current: m.currentValue, target: m.targetValue, unit: m.unit })
                      : t("metricCurrent", { current: m.currentValue, unit: m.unit })
                    : t("metricNotReported")}
                </p>
              </li>
            ))}
          </ul>
        )}
        {summary?.content ? (
          <div className="rounded-xl border border-muted-teal/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-dark-slate">{t("summaryHeading")}</h3>
              {link("wiki/impactsammanfattning", editOrOpen)}
            </div>
            <WikiHtml html={summary.content} />
          </div>
        ) : (
          <p className="text-sm text-dark-slate/50">{t("empty")}</p>
        )}
      </OverviewSection>

      <OverviewSection id="verifiering" title={t("verificationHeading")} badge={t("yourTurn")} fill={fill.verification} writingLabel={writing} failedNote={<>{t("failed")}{retry("verification")}</>} action={link("impact-followup", editOrOpen)}>
        <p className="mb-3 text-sm text-dark-slate/70">
          {t("reportStatus", { verified, pending })}{" "}
          <Link href={`/projects/${slug}/impact`} className="font-medium text-seagrass hover:underline">
            {t("submitReport")}
          </Link>
        </p>
        <FieldGrid empty={t("empty")} fields={[{ key: "externalVerificationNotes", label: t("verificationPlan"), value: followup?.externalVerificationNotes }]} />
      </OverviewSection>

      <OverviewSection id="fira" title={t("celebrationHeading")} fill={fill.celebration} writingLabel={writing} failedNote={<>{t("failed")}{retry("celebration")}</>} action={link("impact-followup", editOrOpen)}>
        <FieldGrid empty={t("empty")} fields={[{ key: "celebrationNotes", label: t("celebrationPlan"), value: followup?.celebrationNotes }]} />
      </OverviewSection>

      <OverviewSection id="uppgifter" title={t("tasksHeading")} fill={fill.tasks} writingLabel={writing} failedNote={<>{t("failed")}{retry("tasks")}</>} action={link("kanban", t("openBoard"))}>
        <TaskList cards={cards} total={openCardCount} aiDraftLabel={t("aiDraft")} moreLabel={(count) => t("moreTasks", { count })} emptyLabel={t("tasksEmpty")} />
      </OverviewSection>

      {!notYet && (
        <OverviewSection id="nasta-steg" title={t("nextHeading")} badge={t("yourTurn")} writingLabel={writing}>
          <NextStepSection
            slug={slug}
            brief={nextBrief?.content ?? null}
            current={DECISION_OPTION[followup?.nextStepDecision ?? "UNDECIDED"]}
            canEdit={canEdit}
            isFounder={isFounder}
            aiAvailable={aiAvailable}
          />
        </OverviewSection>
      )}
    </div>
  );
}
