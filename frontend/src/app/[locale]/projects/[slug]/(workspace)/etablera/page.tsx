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
import { etableraGateCriteria, type GateBrief } from "@/lib/phaseGate";
import { INITIATIVE_CHECKLIST_ITEMS } from "@/lib/projectPhase";
import { isEtableraFillInProgress, parseEtableraStatus, type EtableraFillStatus } from "@/lib/etableraFill";
import OverviewSection from "../ide/OverviewSection";
import PhaseGateSection from "../ide/PhaseGateSection";
import DraftButton from "../uppstart/DraftButton";
import { DraftCta, FieldGrid, FocusBox, GateClosed, OverviewHeader, TaskList, WikiHtml } from "../_overview/parts";

const STEP_ANCHOR: Record<string, string> = {
  process_scaled_up: "drift",
  supporter_base_built: "drift",
  stable_operations_funding: "finansiering",
  funding_secured: "finansiering",
  partnerships_formalized: "partnerskap",
  playbook_documented: "playbook",
  review_council_deep_review: "granskning",
};

// Etablera on one page: what the AI drafted after the pilot's go (plan for
// stable operations and a supporter base, a funding plan, a partnership
// plan, a playbook, first tasks) next to the real state of funding,
// partnerships and the council review — and the gate to Skala.
export default async function EtableraOverviewPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [journeyOn, project] = await Promise.all([
    isFeatureEnabled("ai-project-start", session.user.id),
    prisma.project.findUnique({ where: { slug }, select: { id: true, phase: true } }),
  ]);
  if (!journeyOn) redirect(`/projects/${slug}/guide/establish`);
  if (!project) notFound();

  const [t, tCheck, tGate, canEdit, isFounder, aiAvailable, fillRow, focusBrief, focusDecision, done, plan, wikis, campaign, applications, partnerships, review, cards, openCardCount, gate, gateBrief, gateDecision] =
    await Promise.all([
      getTranslations({ locale, namespace: "EtableraOverview" }),
      getTranslations({ locale, namespace: "ProjectPhaseChecklist" }),
      getTranslations({ locale, namespace: "PhaseGate" }),
      hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES),
      hasProjectRole(project.id, session.user.id, ["FOUNDER"]),
      isAiProjectStartAvailable(session.user.id),
      prisma.phaseFill.findUnique({ where: { projectId_phase: { projectId: project.id, phase: "ESTABLISH" } } }),
      latestInsight<GateBrief>(project.id, "LANSERING_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, fromPhase: "PRODUCTION", outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
      prisma.initiativeChecklistItem.findMany({ where: { projectId: project.id, completedAt: { not: null } }, select: { itemKey: true } }),
      prisma.establishmentPlan.findUnique({ where: { projectSlug: slug } }),
      prisma.wikiPage.findMany({ where: { projectSlug: slug, slug: { in: ["finansieringsplan", "partnerskap", "playbook"] } }, select: { slug: true, content: true } }),
      prisma.fundingCampaign.findUnique({
        where: { projectId: project.id },
        select: { goal: true, currency: true, pledges: { where: { pledgeStatus: "confirmed" }, select: { amount: true } } },
      }),
      prisma.fundingApplication.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, status: true, fundingSource: { select: { name: true } } },
      }),
      prisma.partnership.findMany({
        where: { projectId: project.id, status: { in: ["active", "pending"] } },
        select: { id: true, status: true, type: true, organisation: { select: { name: true } } },
      }),
      prisma.reviewCouncilRequest.findFirst({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, select: { status: true, outcomeNote: true } }),
      prisma.kanbanCard.findMany({
        where: { projectSlug: slug, column: { not: "DONE" } },
        orderBy: [{ createdAt: "desc" }],
        take: 8,
        select: { id: true, title: true, createdByAi: true },
      }),
      prisma.kanbanCard.count({ where: { projectSlug: slug, column: { not: "DONE" } } }),
      etableraGateCriteria(project.id, slug),
      latestInsight<GateBrief>(project.id, "ETABLERA_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, fromPhase: "ESTABLISH" }, orderBy: { createdAt: "desc" } }),
    ]);

  const fill: EtableraFillStatus = fillRow ? parseEtableraStatus(fillRow.status, fillRow.updatedAt) : {};
  const doneKeys = new Set(done.map((d) => d.itemKey));
  const notYet = ["IDEA", "SPRINT", "PILOT", "PRODUCTION"].includes(project.phase);
  const writing = t("writing");
  const wiki = (s: string) => wikis.find((w) => w.slug === s)?.content;
  const pledged = campaign?.pledges.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const criterionLabel = (key: string) => tCheck(key as Parameters<typeof tCheck>[0]);
  const decisionDate = (d: Date) => d.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const retry = (section: string) =>
    canEdit && aiAvailable ? (
      <>
        {" "}
        <DraftButton phase="etablera" slug={slug} section={section} label={t("retry")} />
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
        intro={isEtableraFillInProgress(fill) ? t("introWriting") : t("intro")}
        polling={isEtableraFillInProgress(fill)}
        stepByStep={{ href: `/projects/${slug}/guide/establish`, label: t("stepByStep") }}
        notYet={notYet ? { text: t("notYet"), href: `/projects/${slug}/lansering#fasgrind`, linkLabel: t("toGate") } : null}
        progressLabel={t("progressLabel")}
        steps={INITIATIVE_CHECKLIST_ITEMS.ESTABLISH.map((s) => ({ key: s.key, label: criterionLabel(s.key), done: doneKeys.has(s.key), anchor: STEP_ANCHOR[s.key] ?? "drift" }))}
        draftCta={
          !fillRow && canEdit && aiAvailable && !notYet ? (
            <DraftCta text={t("draftIntro")}>
              <DraftButton phase="etablera" slug={slug} label={t("draftAll")} variant="primary" />
            </DraftCta>
          ) : null
        }
      />

      <FocusBox heading={t("focusHeading")} items={focusBrief?.content.nextFocus ?? []} note={focusDecision?.note} />

      <OverviewSection id="drift" title={t("planHeading")} fill={fill.plan} writingLabel={writing} failedNote={<>{t("failed")}{retry("plan")}</>} action={link("establishment-plan", editOrOpen)}>
        <FieldGrid
          empty={t("empty")}
          fields={[
            { key: "scaledProcessNotes", label: t("planProcess"), value: plan?.scaledProcessNotes },
            { key: "supporterBaseNotes", label: t("planSupporters"), value: plan?.supporterBaseNotes },
          ]}
        />
      </OverviewSection>

      <OverviewSection
        id="finansiering"
        title={t("fundingHeading")}
        badge={t("yourTurn")}
        fill={fill.funding}
        writingLabel={writing}
        failedNote={<>{t("failed")}{retry("funding")}</>}
        action={link("funding-applications", t("fundingApply"))}
      >
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg border border-muted-teal/30 px-3 py-1.5 text-dark-slate/75">
            {campaign ? t("campaignStatus", { pledged, goal: campaign.goal, currency: campaign.currency }) : t("noCampaign")}{" "}
            <Link href={`/projects/${slug}/funding`} className="font-medium text-seagrass hover:underline">
              {t("open")}
            </Link>
          </span>
          {applications.map((a) => (
            <span key={a.id} className="rounded-lg border border-muted-teal/30 px-3 py-1.5 text-dark-slate/75">
              {a.fundingSource.name}: <span className="font-medium">{t(`application_${a.status}`)}</span>
            </span>
          ))}
        </div>
        {wiki("finansieringsplan") ? <WikiHtml html={wiki("finansieringsplan")!} /> : <p className="text-sm text-dark-slate/50">{t("empty")}</p>}
      </OverviewSection>

      <OverviewSection
        id="partnerskap"
        title={t("partnersHeading")}
        badge={t("yourTurn")}
        fill={fill.partners}
        writingLabel={writing}
        failedNote={<>{t("failed")}{retry("partners")}</>}
        action={link("partnerships", t("manage"))}
      >
        {partnerships.length > 0 && (
          <ul className="mb-4 flex flex-wrap gap-2 text-sm">
            {partnerships.map((p) => (
              <li key={p.id} className="rounded-lg border border-muted-teal/30 px-3 py-1.5 text-dark-slate/75">
                {p.organisation.name} · {t(`partnership_${p.status}`)}
              </li>
            ))}
          </ul>
        )}
        {wiki("partnerskap") ? <WikiHtml html={wiki("partnerskap")!} /> : <p className="text-sm text-dark-slate/50">{t("empty")}</p>}
      </OverviewSection>

      <OverviewSection
        id="playbook"
        title={t("playbookHeading")}
        fill={fill.playbook}
        writingLabel={writing}
        failedNote={<>{t("failed")}{retry("playbook")}</>}
        action={wiki("playbook") ? link("wiki/playbook", editOrOpen) : undefined}
      >
        <p className="mb-3 text-sm text-dark-slate/70">{t("playbookIntro")}</p>
        {wiki("playbook") ? <WikiHtml html={wiki("playbook")!} /> : <p className="text-sm text-dark-slate/50">{t("empty")}</p>}
      </OverviewSection>

      <OverviewSection id="granskning" title={t("reviewHeading")} badge={t("yourTurn")} writingLabel={writing} action={link("review-request", review ? t("open") : t("reviewRequest"))}>
        <p className="text-sm text-dark-slate/70">{t("reviewIntro")}</p>
        <p className="mt-2 text-sm">
          {t("reviewStatusLabel")}: <span className="font-semibold text-dark-slate">{review ? t(`review_${review.status}`) : t("review_none")}</span>
        </p>
        {review?.outcomeNote && <p className="mt-1 whitespace-pre-line text-sm text-dark-slate/70">{review.outcomeNote}</p>}
      </OverviewSection>

      <OverviewSection id="uppgifter" title={t("tasksHeading")} fill={fill.tasks} writingLabel={writing} failedNote={<>{t("failed")}{retry("tasks")}</>} action={link("kanban", t("openBoard"))}>
        <TaskList cards={cards} total={openCardCount} aiDraftLabel={t("aiDraft")} moreLabel={(count) => t("moreTasks", { count })} emptyLabel={t("tasksEmpty")} />
      </OverviewSection>

      {project.phase === "ESTABLISH" ? (
        <OverviewSection id="fasgrind" title={t("gateHeading")} badge={t("yourTurn")} writingLabel={writing}>
          <PhaseGateSection
            gate="etablera"
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
          <GateClosed text={tGate("etablera.closed", { date: decisionDate(gateDecision.createdAt) })} href={`/projects/${slug}/skala`} linkLabel={t("gateClosedLink")} />
        )
      )}
    </div>
  );
}
