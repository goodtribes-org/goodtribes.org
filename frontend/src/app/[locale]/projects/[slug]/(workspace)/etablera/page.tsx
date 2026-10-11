import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import { decidedSince, lastRestartAt } from "@/lib/phaseRestart";
import { startPhaseWikiPage } from "../phase-wiki-actions";
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
import { etableraGateCriteria, type GateBrief } from "@/lib/phaseGate";
import { ETABLERA_STEPS, etableraStepsDone, type EtableraStep } from "@/lib/establish";
import { isWrittenPhaseWiki } from "@/lib/phaseWikiTemplates";
import { isEtableraFillInProgress, parseEtableraStatus, type EtableraFillStatus } from "@/lib/etableraFill";
import OverviewSection from "../ide/OverviewSection";
import PhaseSteps, { type PhaseStep } from "../ide/PhaseSteps";
import FillPoller from "../ide/FillPoller";
import PhaseGateSection from "../ide/PhaseGateSection";
import DraftButton from "../uppstart/DraftButton";
import PlanFields from "../uppstart/PlanFields";
import { savePlanForward } from "../lansering/actions";
import { saveSupporterNotes } from "./actions";
import EtableraAiHelp from "./EtableraAiHelp";
import { DraftCta, FocusBox, GateClosed, WikiHtml } from "../_overview/parts";
import PhaseProgressStrip from "../../PhaseProgressStrip";

// Which section of this page each Etablera step lives in (#329).
const STEP_ANCHOR: Record<EtableraStep, string> = {
  playbook_documented: "sa-har-gor-vi",
  stable_operations_funding: "pengar",
  partnerships_formalized: "samarbeten",
  supporter_base_built: "manniskor",
};

// Etablera (#329): get it running on its own, so it doesn't hang on a few
// enthusiasts — one step at a time, like the earlier phases. How we do it
// (one document), money that lasts, partnerships and the people around the
// project, then the gate, where the review council can be asked for a
// review. Everything a step needs is open on it; nothing older is lost.
export default async function EtableraOverviewPage({
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

  const [t, tCheck, tGate, tLan, tUpp, canEdit, isFounder, aiConfigured, fillRow, focusBrief, focusDecision, done, plan, wikis, launch, campaign, applications, partnerships, people, cards, gate, gateBrief, gateDecision] =
    await Promise.all([
      getTranslations({ locale, namespace: "EtableraOverview" }),
      getTranslations({ locale, namespace: "ProjectPhaseChecklist" }),
      getTranslations({ locale, namespace: "PhaseGate" }),
      getTranslations({ locale, namespace: "LanseringOverview" }),
      getTranslations({ locale, namespace: "UppstartOverview" }),
      hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES),
      hasProjectRole(project.id, session.user.id, ["FOUNDER"]),
      isAiProjectStartAvailable(session.user.id),
      prisma.phaseFill.findUnique({ where: { projectId_phase: { projectId: project.id, phase: "ESTABLISH" } } }),
      latestInsight<GateBrief>(project.id, "LANSERING_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, fromPhase: "PRODUCTION", outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
      prisma.initiativeChecklistItem.findMany({ where: { projectId: project.id, completedAt: { not: null } }, select: { itemKey: true } }),
      prisma.establishmentPlan.findUnique({ where: { projectSlug: slug } }),
      prisma.wikiPage.findMany({ where: { projectSlug: slug, slug: { in: ["playbook", "arbetsfloden", "finansieringsplan", "partnerskap"] } }, select: { slug: true, content: true } }),
      prisma.launchPlan.findUnique({ where: { projectSlug: slug }, select: { budgetOverview: true, whoPays: true } }),
      prisma.fundingCampaign.findUnique({
        where: { projectId: project.id },
        select: { goal: true, currency: true, pledges: { where: { pledgeStatus: "confirmed" }, select: { amount: true } } },
      }),
      prisma.fundingApplication.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, status: true, fundingSource: { select: { name: true } } },
      }),
      prisma.partnership.findMany({
        where: { projectId: project.id, status: { in: ["active", "pending"] } },
        select: { id: true, status: true, organisation: { select: { name: true } } },
      }),
      Promise.all([
        prisma.projectMember.count({ where: { projectId: project.id, role: { not: "FOLLOWER" } } }),
        prisma.projectMember.count({ where: { projectId: project.id, role: "FOLLOWER" } }),
        prisma.kanbanCard.findMany({ where: { projectSlug: slug, column: "DONE", assigneeId: { not: null } }, select: { assigneeId: true }, distinct: ["assigneeId"] }),
      ]),
      prisma.kanbanCard.findMany({
        where: { projectSlug: slug, phase: "ESTABLISH", stepKey: { not: null } },
        orderBy: [{ column: "asc" }, { order: "asc" }],
        select: { id: true, title: true, column: true, stepKey: true, createdByAi: true },
      }),
      etableraGateCriteria(project.id, slug),
      latestInsight<GateBrief>(project.id, "ETABLERA_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, ...decidedSince(restartAt), fromPhase: "ESTABLISH" }, orderBy: { createdAt: "desc" } }),
    ]);
  // AI only where the project uses it (#310), per step for the AI buttons.
  const aiAvailable = aiConfigured && (await resolveAiMode({ projectId: project.id, feature: "project-plan", phase: "ESTABLISH" })).mode !== "MANUAL";
  const stepModes = aiConfigured
    ? await Promise.all(ETABLERA_STEPS.map((stepKey) => resolveAiMode({ projectId: project.id, feature: "project-plan", stepKey, phase: "ESTABLISH" })))
    : [];
  const stepAi = (key: EtableraStep) => canEdit && aiConfigured && stepModes[ETABLERA_STEPS.indexOf(key)]?.mode !== "MANUAL";
  const fill: EtableraFillStatus = fillRow ? parseEtableraStatus(fillRow.status, fillRow.updatedAt) : {};
  const doneKeys = new Set(done.map((d) => d.itemKey));
  const notYet = ["IDEA", "SPRINT", "PILOT", "PRODUCTION"].includes(project.phase);
  const writing = t("writing");
  const wiki = (s: string) => wikis.find((w) => w.slug === s)?.content;
  const written = (s: string) => isWrittenPhaseWiki(s, wiki(s));
  const pledged = campaign?.pledges.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const [memberCount, followerCount, helpers] = people;
  const criterionLabel = (key: string) => tCheck(key as Parameters<typeof tCheck>[0]);
  const work = await getPhaseWork(slug, "ESTABLISH");
  const decisionDate = (d: Date) => d.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const retry = (section: string) =>
    canEdit && aiAvailable ? (
      <>
        {" "}
        <DraftButton phase="etablera" slug={slug} section={section} label={t("retry")} />
      </>
    ) : null;
  const toolLink = (href: string, label: string) => (
    <Link href={`/projects/${slug}/${href}`} className="text-sm font-semibold text-seagrass hover:underline">
      {label} →
    </Link>
  );

  const shown = etableraStepsDone({
    playbookHtml: wiki("playbook"),
    fundingSecured: applications.some((a) => a.status === "awarded") || pledged > 0,
    activePartnerships: partnerships.filter((p) => p.status === "active").length,
    supporterBaseNotes: plan?.supporterBaseNotes,
  });
  const steps: PhaseStep[] = ETABLERA_STEPS.map((key) => {
    const hasContent =
      key === "playbook_documented" ? !!wiki("playbook") || !!wiki("arbetsfloden")
      : key === "stable_operations_funding" ? !!campaign || applications.length > 0 || !!launch?.budgetOverview
      : key === "partnerships_formalized" ? partnerships.length > 0
      : !!plan?.supporterBaseNotes?.trim();
    return { key, anchor: STEP_ANCHOR[key], label: criterionLabel(key), status: doneKeys.has(key) || shown[key] ? "done" : hasContent ? "started" : "empty" };
  });
  const inEtablera = project.phase === "ESTABLISH";
  if (inEtablera) steps.push({ key: "gate", anchor: "fasgrind", status: gateDecision ? "done" : "empty", label: t("gateHeading") });

  const stepIntro = (text: string) => <p className="mb-4 text-center text-sm text-dark-slate/70">{text}</p>;
  const sub = (title: string) => <h3 className="mb-2 mt-6 border-t border-muted-teal/20 pt-4 text-base font-semibold text-dark-slate">{title}</h3>;
  const keyOf = (...v: (string | null | undefined)[]) => v.map((x) => x ?? "").join("|");
  const stepTasks = (key: EtableraStep) => {
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
  // An older text shown in full under the step, so nothing written earlier is lost.
  const older = (heading: string, html: string | null | undefined, text?: string | null) =>
    (html || text?.trim()) && (
      <div className="mt-6 rounded-xl border border-muted-teal/30 bg-dry-sage/10 p-4">
        <h3 className="mb-2 text-sm font-semibold text-dark-slate/70">{heading}</h3>
        {html ? <WikiHtml html={html} /> : <p className="whitespace-pre-line text-sm text-dark-slate/80">{text}</p>}
      </div>
    );
  const draftCta =
    !fillRow && canEdit && aiAvailable && !notYet ? (
      <DraftCta text={t("draftIntro")}>
        <DraftButton phase="etablera" slug={slug} label={t("draftAll")} variant="primary" />
      </DraftCta>
    ) : null;
  const review = gate.review;

  return (
    <div data-phase-page className="flex flex-col gap-5 pt-3 pb-6">
      {/* Same layout rules as the Idé, Uppstart and Lansering pages. */}
      <style data-keep>{`[data-phase-page] > * { width: 100%; max-width: 64rem; margin-inline: auto; } [data-phase-page][data-aligned] > * { max-width: none; margin-inline: 0; margin-left: var(--align-left); width: var(--align-width); }`}</style>
      <div data-keep className="contents">
        <PhaseProgressStrip projectId={project.id} slug={slug} viewing="ESTABLISH" />
        {isEtableraFillInProgress(fill) && <FillPoller />}
      </div>
      {notYet && (
        <p data-keep className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("notYet")}{" "}
          <Link href={`/projects/${slug}/lansering?step=gate`} className="font-semibold underline underline-offset-2">
            {t("toGate")}
          </Link>
        </p>
      )}
      {isEtableraFillInProgress(fill) && (
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

      <div data-step="playbook_documented" className="flex flex-col gap-5">
        <FocusBox heading={t("focusHeading")} items={focusBrief?.content.nextFocus ?? []} note={focusDecision?.note} />
        <OverviewSection
          id="sa-har-gor-vi"
          introKey="howWeDoIt"
          title={criterionLabel("playbook_documented")}
          fill={fill.playbook}
          writingLabel={writing}
          failedNote={<>{t("failed")}{retry("playbook")}</>}
        >
          {stepIntro(t("playbookIntro"))}
          {wiki("playbook") ? (
            <>
              <WikiHtml html={wiki("playbook")!} />
              <div className="mt-3">{toolLink("wiki/playbook", canEdit ? t("playbookEdit") : t("open"))}</div>
            </>
          ) : canEdit ? (
            <form action={startPhaseWikiPage.bind(null, slug, "playbook")} className="flex flex-col items-center gap-2">
              <p className="text-sm text-dark-slate/60">{t("playbookEmpty")}</p>
              <button type="submit" className="rounded-lg bg-seagrass px-4 py-2 text-sm font-semibold text-white hover:opacity-90">{t("playbookStart")}</button>
            </form>
          ) : (
            <p className="text-sm text-dark-slate/50">{t("empty")}</p>
          )}
          {older(t("olderWorkflows"), wiki("arbetsfloden"))}
          {older(t("olderProcess"), null, plan?.scaledProcessNotes)}
          {stepTasks("playbook_documented")}
          {stepAi("playbook_documented") && !written("playbook") && <EtableraAiHelp slug={slug} kind="playbook" canUse />}
        </OverviewSection>
      </div>

      <div data-step="stable_operations_funding" className="flex flex-col gap-5">
        <OverviewSection id="pengar" introKey="moneyThatLasts" title={criterionLabel("stable_operations_funding")} fill={fill.funding} writingLabel={writing} failedNote={<>{t("failed")}{retry("funding")}</>}>
          {stepIntro(t("fundingIntro"))}
          <PlanFields
            key={keyOf(launch?.budgetOverview, launch?.whoPays)}
            slug={slug}
            canEdit={canEdit}
            save={savePlanForward}
            fields={[
              { key: "budgetOverview", label: tLan("planCostLabel"), value: launch?.budgetOverview ?? null, placeholder: tLan("planCostPlaceholder") },
              { key: "whoPays", label: tLan("planPaysLabel"), value: launch?.whoPays ?? null, placeholder: tLan("planPaysPlaceholder") },
            ]}
          />
          {sub(t("fundingSourcesHeading"))}
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-muted-teal/30 px-3 py-2 text-dark-slate/80">
              <span>{campaign ? t("campaignStatus", { pledged, goal: campaign.goal, currency: campaign.currency }) : t("noCampaign")}</span>
              {toolLink("funding", campaign ? t("open") : t("campaignStart"))}
            </li>
            {applications.map((a) => (
              <li key={a.id} className="rounded-lg border border-muted-teal/30 px-3 py-2 text-dark-slate/80">
                {a.fundingSource.name}: <span className="font-medium">{t(`application_${a.status}`)}</span>
              </li>
            ))}
            <li>{toolLink("funding-applications", t("fundingApply"))}</li>
          </ul>
          {older(t("fundingAdvice"), wiki("finansieringsplan"))}
          {stepTasks("stable_operations_funding")}
          {stepAi("stable_operations_funding") && !written("finansieringsplan") && <EtableraAiHelp slug={slug} kind="finansieringsplan" canUse />}
        </OverviewSection>
      </div>

      <div data-step="partnerships_formalized" className="flex flex-col gap-5">
        <OverviewSection id="samarbeten" introKey="partnerships" title={criterionLabel("partnerships_formalized")} fill={fill.partners} writingLabel={writing} failedNote={<>{t("failed")}{retry("partners")}</>}>
          {stepIntro(t("partnersIntro"))}
          {partnerships.length > 0 ? (
            <ul className="mb-3 flex flex-col gap-2 text-sm">
              {partnerships.map((p) => (
                <li key={p.id} className="rounded-lg border border-muted-teal/30 px-3 py-2 text-dark-slate/80">
                  {p.organisation.name} · <span className="font-medium">{t(`partnership_${p.status}`)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-sm text-dark-slate/50">{t("noPartners")}</p>
          )}
          {toolLink("partnerships", t("partnersAdd"))}
          {older(t("partnersAdvice"), wiki("partnerskap"))}
          {stepTasks("partnerships_formalized")}
          {stepAi("partnerships_formalized") && !written("partnerskap") && <EtableraAiHelp slug={slug} kind="partnerskap" canUse />}
        </OverviewSection>
      </div>

      <div data-step="supporter_base_built" className="flex flex-col gap-5">
        <OverviewSection id="manniskor" introKey="peopleAround" title={criterionLabel("supporter_base_built")} fill={fill.supporters} writingLabel={writing} failedNote={<>{t("failed")}{retry("supporters")}</>}>
          {stepIntro(t("peopleIntro"))}
          <ul className="mb-5 grid gap-2 text-center text-sm sm:grid-cols-3">
            {[
              [memberCount, t("peopleMembers")],
              [followerCount, t("peopleFollowers")],
              [helpers.length, t("peopleHelpers")],
            ].map(([n, label]) => (
              <li key={label as string} className="rounded-xl border border-muted-teal/30 px-3 py-3">
                <span className="block text-2xl font-bold text-dark-slate">{n}</span>
                <span className="text-dark-slate/60">{label}</span>
              </li>
            ))}
          </ul>
          <PlanFields
            key={keyOf(plan?.supporterBaseNotes)}
            slug={slug}
            canEdit={canEdit}
            save={saveSupporterNotes}
            fields={[{ key: "supporterBaseNotes", label: t("peopleNotesLabel"), value: plan?.supporterBaseNotes ?? null, placeholder: t("peopleNotesPlaceholder"), rows: 5 }]}
          />
          {stepTasks("supporter_base_built")}
          {stepAi("supporter_base_built") && !plan?.supporterBaseNotes?.trim() && <EtableraAiHelp slug={slug} kind="supporters" canUse />}
        </OverviewSection>
      </div>

      {inEtablera ? (
        <div data-step="gate">
          <OverviewSection id="fasgrind" introKey="etableraGate" title={t("gateHeading")} writingLabel={writing}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-muted-teal/30 bg-dry-sage/15 px-4 py-3 text-sm text-dark-slate/80">
              <div>
                <p className="font-medium text-dark-slate">{t("reviewHeading")}</p>
                <p>
                  {t("reviewIntro")} {t("reviewStatusLabel")}: <span className="font-semibold">{review ? t(`review_${review.status}`) : t("review_none")}</span>
                </p>
                {review?.outcomeNote && <p className="mt-1 whitespace-pre-line text-dark-slate/70">{review.outcomeNote}</p>}
              </div>
              {toolLink("review-request", review ? t("open") : t("reviewRequest"))}
            </div>
            <PhaseGateSection
              gate="etablera"
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
            <GateClosed text={tGate("etablera.closed", { date: decisionDate(gateDecision.createdAt) })} href={`/projects/${slug}/skala`} linkLabel={t("gateClosedLink")} />
          </div>
        )
      )}
      <PhaseSteps steps={steps} initialView={view === "all" ? "all" : "steps"} slug={slug} cardsByStep={{}} canEdit={false} />
    </div>
  );
}
