import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import { resolveAiMode } from "@/lib/aiMode";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { latestInsight } from "@/lib/ideaInsights";
import type { GateBrief } from "@/lib/phaseGate";
import { getCanvasFieldLabels } from "@/lib/canvasFieldLabels";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { IMPACT_STEPS, impactStepsDone, storyTemplate, trustLevel, type ImpactStep } from "@/lib/impactStory";
import { isImpactFillInProgress, parseImpactStatus, type ImpactFillStatus, type NextStepBrief, type NextStepOption } from "@/lib/impactPhaseFill";
import { IMPACT_MODEL_FIELDS } from "../impact-model/fields";
import OverviewSection from "../ide/OverviewSection";
import PhaseSteps, { type PhaseStep } from "../ide/PhaseSteps";
import FillPoller from "../ide/FillPoller";
import DraftButton from "../uppstart/DraftButton";
import PlanFields from "../uppstart/PlanFields";
import { DraftCta, FocusBox } from "../_overview/parts";
import NextStepSection from "./NextStepSection";
import { saveImpactFollowup } from "./actions";
import { ImpactAiHelp, ShareStory, StoryStart, VoiceForm } from "./ImpactSteps";
import PartnerLinks, { type PartnerLink } from "./PartnerLinks";
import { confirmationState } from "@/lib/impactConfirmation";
import PhaseProgressStrip from "../../PhaseProgressStrip";

// Which section of this page each Impact step lives in (#334).
const STEP_ANCHOR: Record<ImpactStep, string> = {
  sdg_impact_measured: "berattelse",
  voice_shared: "rost",
  impact_externally_verified: "vem-har-sett",
  results_celebrated: "tacka",
  next_step_decided: "nasta-steg",
};

const DECISION_OPTION: Record<string, NextStepOption | null> = { UNDECIDED: null, CONTINUE: "continue", REPLICATE: "replicate", CLOSE_RESPONSIBLY: "close" };

// Impact (#334): show honestly what you achieved, without administration,
// and decide what happens next — one step at a time, like the other phases.
// The story is put together from what the project already has; a voice;
// who has seen it (a trust ladder, never a requirement); thank and share;
// what now. Figures are shown as reported, never summed.
export default async function ImpactOverviewPage({
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

  const [t, tCheck, tUpp, fieldLabels, canEdit, isFounder, aiConfigured, fillRow, focusBrief, focusDecision, checked, metrics, reports, followup, impactModel, nextBrief, cards, members, helpers, givers, aiUser, pulses, confirmations] =
    await Promise.all([
      getTranslations({ locale, namespace: "ImpactOverview" }),
      getTranslations({ locale, namespace: "ProjectPhaseChecklist" }),
      getTranslations({ locale, namespace: "UppstartOverview" }),
      getCanvasFieldLabels(locale),
      hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES),
      hasProjectRole(project.id, session.user.id, ["FOUNDER"]),
      isAiProjectStartAvailable(session.user.id),
      prisma.phaseFill.findUnique({ where: { projectId_phase: { projectId: project.id, phase: "IMPACT" } } }),
      latestInsight<GateBrief>(project.id, "SKALA_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, fromPhase: "SCALE", outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
      prisma.initiativeChecklistItem.findMany({ where: { projectId: project.id, completedAt: { not: null } }, select: { itemKey: true } }),
      prisma.impactMetric.findMany({ where: { projectSlug: slug }, orderBy: { createdAt: "asc" }, select: { id: true, label: true, unit: true, currentValue: true, targetValue: true, _count: { select: { updates: true } } } }),
      prisma.impactReport.findMany({
        where: { projectId: project.id, kind: "DELIVERED", rejectedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, metricDescription: true, metricValue: true, metricUnit: true, valueQualifier: true, isCumulative: true, verifiedAt: true },
      }),
      prisma.impactFollowup.findUnique({ where: { projectSlug: slug } }),
      prisma.impactModel.findUnique({ where: { projectSlug: slug } }),
      latestInsight<NextStepBrief>(project.id, "IMPACT_NEXT_STEP"),
      prisma.kanbanCard.findMany({
        where: { projectSlug: slug, phase: "IMPACT", stepKey: { not: null } },
        orderBy: [{ column: "asc" }, { order: "asc" }],
        select: { id: true, title: true, column: true, stepKey: true, createdByAi: true },
      }),
      prisma.projectMember.findMany({ where: { projectId: project.id, role: { not: "FOLLOWER" } }, select: { userId: true } }),
      prisma.kanbanCard.findMany({ where: { projectSlug: slug, column: "DONE", assigneeId: { not: null } }, select: { assigneeId: true }, distinct: ["assigneeId"] }),
      prisma.fundingPledge.findMany({ where: { campaign: { projectId: project.id }, pledgeStatus: "confirmed" }, select: { userId: true }, distinct: ["userId"] }),
      getAiParticipantUser(),
      // The team's monthly pulse (#335): sentences and photos, oldest first.
      prisma.impactPulse.findMany({
        where: { projectId: project.id, OR: [{ note: { not: null } }, { imageUrl: { not: null } }] },
        orderBy: { createdAt: "asc" },
        take: 36,
        select: { id: true, note: true, imageUrl: true, createdAt: true },
      }),
      // Partner confirmation links (#336), newest first.
      prisma.impactConfirmation.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, label: true, createdAt: true, expiresAt: true, revokedAt: true, confirmedAt: true, confirmerName: true, confirmerOrg: true, comment: true, showOrgPublicly: true },
      }),
    ]);
  // AI only where the project uses it (#310), per step for the AI buttons.
  const aiAvailable = aiConfigured && (await resolveAiMode({ projectId: project.id, feature: "project-plan", phase: "IMPACT" })).mode !== "MANUAL";
  const stepModes = aiConfigured
    ? await Promise.all(IMPACT_STEPS.map((stepKey) => resolveAiMode({ projectId: project.id, feature: "project-plan", stepKey, phase: "IMPACT" })))
    : [];
  const stepAi = (key: ImpactStep) => canEdit && aiConfigured && stepModes[IMPACT_STEPS.indexOf(key)]?.mode !== "MANUAL";
  const fill: ImpactFillStatus = fillRow ? parseImpactStatus(fillRow.status, fillRow.updatedAt) : {};
  const notYet = project.phase !== "IMPACT";
  const writing = t("writing");
  const criterionLabel = (key: string) => tCheck(key as Parameters<typeof tCheck>[0]);
  const retry = (section: string) =>
    canEdit && aiAvailable ? (
      <>
        {" "}
        <DraftButton phase="impact" slug={slug} section={section} label={t("retry")} />
      </>
    ) : null;
  const toolLink = (href: string, label: string) => (
    <Link href={`/projects/${slug}/${href}`} className="text-sm font-semibold text-seagrass hover:underline">
      {label} →
    </Link>
  );

  const verified = reports.filter((r) => r.verifiedAt).length;
  const data = { followup, deliveredReports: reports.length, verifiedDeliveredReports: verified, partnerConfirmations: confirmations.filter((c) => c.confirmedAt).length };
  const shown = impactStepsDone(data);
  const level = trustLevel(data);
  const doneKeys = new Set(checked.map((c) => c.itemKey));
  const contributors = new Set([...members.map((m) => m.userId), ...helpers.map((h) => h.assigneeId!), ...givers.map((g) => g.userId)]);
  contributors.delete(session.user.id);
  contributors.delete(aiUser.id);
  const steps: PhaseStep[] = IMPACT_STEPS.map((key) => {
    const hasContent =
      key === "sdg_impact_measured" ? metrics.some((m) => m._count.updates > 0)
      : key === "voice_shared" ? !!followup?.voiceQuote?.trim()
      : key === "impact_externally_verified" ? reports.length > 0 || confirmations.length > 0
      : key === "results_celebrated" ? false
      : !!nextBrief;
    return { key, anchor: STEP_ANCHOR[key], label: criterionLabel(key), status: doneKeys.has(key) || shown[key] ? "done" : hasContent ? "started" : "empty" };
  });

  const dayFmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" });
  const partnerLinks: PartnerLink[] = confirmations.map((c) => {
    const state = confirmationState(c, Date.now());
    return {
      id: c.id, label: c.label, state,
      date: dayFmt.format(state === "confirmed" ? c.confirmedAt! : state === "revoked" ? c.revokedAt! : c.expiresAt),
      confirmerName: c.confirmerName, confirmerOrg: c.confirmerOrg, comment: c.comment, showOrgPublicly: c.showOrgPublicly,
    };
  });
  const stepIntro = (text: string) => <p className="mb-4 text-center text-sm text-dark-slate/70">{text}</p>;
  const sub = (title: string) => <h3 className="mb-2 mt-6 border-t border-muted-teal/20 pt-4 text-base font-semibold text-dark-slate">{title}</h3>;
  const keyOf = (...v: (string | null | undefined)[]) => v.map((x) => x ?? "").join("|");
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));
  const stepTasks = (key: ImpactStep) => {
    const open = cards.filter((c) => c.stepKey === key && c.column !== "DONE");
    if (!open.length) return null;
    return (
      <div className="mt-6 border-t border-muted-teal/20 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-dark-slate">{tUpp("stepTasksHeading")}</h3>
          <Link href={`/projects/${slug}/kanban`} className="text-xs font-medium text-dark-slate/50 hover:text-coral">
            {tUpp("openBoard")}
          </Link>
        </div>
        <ul className="flex flex-col divide-y divide-muted-teal/15">
          {open.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm text-dark-slate/80">
              <span>☐ {c.title}</span>
              {c.createdByAi && aiAvailable && <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-seagrass">{tUpp("aiDraft")}</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  };
  const draftCta =
    !fillRow && canEdit && aiAvailable && !notYet ? (
      <DraftCta text={t("draftIntro")}>
        <DraftButton phase="impact" slug={slug} label={t("draftAll")} variant="primary" />
      </DraftCta>
    ) : null;
  const planned = IMPACT_MODEL_FIELDS.filter((f) => f.endsWith("Outcomes") && typeof impactModel?.[f] === "string" && (impactModel[f] as string).trim());
  const decision = followup?.nextStepDecision ?? "UNDECIDED";
  const reported = metrics.filter((m) => m._count.updates > 0);
  // The start "Fyll i från projektets siffror" puts in the story field.
  const monthFmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { month: "long", year: "numeric" });
  const storyStart = storyTemplate(
    { did: t("tplDid"), numbers: t("tplNumbers"), meant: t("tplMeant"), next: t("tplNext"), cumulative: t("tplCumulative"), atLeast: t("tplAtLeast"), approx: t("tplApprox"), moments: t("tplMoments") },
    metrics.map((m) => ({ label: m.label, unit: m.unit, currentValue: m.currentValue, updates: m._count.updates })),
    reports,
    pulses.filter((p) => p.note?.trim()).map((p) => `${monthFmt.format(p.createdAt)}: ${p.note!.trim()}`),
  );

  return (
    <div data-phase-page className="flex flex-col gap-5 pt-3 pb-6">
      {/* Same layout rules as the earlier phase pages. */}
      <style data-keep>{`[data-phase-page] > * { width: 100%; max-width: 64rem; margin-inline: auto; } [data-phase-page][data-aligned] > * { max-width: none; margin-inline: 0; margin-left: var(--align-left); width: var(--align-width); }`}</style>
      <div data-keep className="contents">
        <PhaseProgressStrip projectId={project.id} slug={slug} viewing="IMPACT" />
        {isImpactFillInProgress(fill) && <FillPoller />}
      </div>
      {notYet && (
        <p data-keep className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("notYet")}{" "}
          <Link href={`/projects/${slug}/skala?step=gate`} className="font-semibold underline underline-offset-2">
            {t("toGate")}
          </Link>
        </p>
      )}
      {isImpactFillInProgress(fill) && (
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

      <div data-step="sdg_impact_measured" className="flex flex-col gap-5">
        <FocusBox heading={t("focusHeading")} items={focusBrief?.content.nextFocus ?? []} note={focusDecision?.note} />
        <OverviewSection id="berattelse" introKey="yourStory" title={criterionLabel("sdg_impact_measured")} fill={fill.story} writingLabel={writing} failedNote={<>{t("failed")}{retry("story")}</>}>
          {stepIntro(t("storyIntro"))}
          {!followup?.story?.trim() && canEdit ? (
            <StoryStart slug={slug} template={storyStart} />
          ) : (
            <PlanFields
              key={keyOf(followup?.story)}
              slug={slug}
              canEdit={canEdit}
              save={saveImpactFollowup}
              fields={[{ key: "story", label: t("storyLabel"), value: followup?.story ?? null, placeholder: t("storyPlaceholder"), rows: 10 }]}
            />
          )}
          {sub(t("numbersHeading"))}
          {reported.length || reports.length ? (
            <ul className="flex flex-col gap-1.5 text-sm text-dark-slate/80">
              {reported.map((m) => (
                <li key={m.id}>📏 {m.label}: <span className="font-semibold">{fmt(m.currentValue)} {m.unit}</span></li>
              ))}
              {reports.map((r) => (
                <li key={r.id}>
                  📄 {r.metricDescription}:{" "}
                  <span className="font-semibold">
                    {r.valueQualifier === "AT_LEAST" ? `${t("atLeast")} ` : r.valueQualifier === "APPROXIMATE" ? `${t("approx")} ` : ""}
                    {fmt(r.metricValue)} {r.metricUnit ?? ""}
                  </span>
                  {r.isCumulative && <span className="text-dark-slate/50"> ({t("cumulative")})</span>}
                  {r.verifiedAt && <span className="ml-1 text-xs text-seagrass">✓ {t("verified")}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-dark-slate/50">{t("noNumbers")}</p>
          )}
          <p className="mt-2 text-xs text-dark-slate/50">{t("neverSummed")}</p>
          <div className="mt-2">{toolLink("impact", t("reportMore"))}</div>
          {sub(t("pulseHeading"))}
          {pulses.length > 0 && (
            <ul className="mb-2 flex flex-col gap-2 text-sm">
              {pulses.map((p) => (
                <li key={p.id} className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{monthFmt.format(p.createdAt)}</span>
                  {p.note && <span className="text-dark-slate/80">{p.note}</span>}
                  {p.imageUrl && <img src={p.imageUrl} alt="" className="max-h-40 w-full max-w-xs rounded-lg object-cover" />}
                </li>
              ))}
            </ul>
          )}
          {toolLink("puls", t("pulseLink"))}
          {planned.length > 0 && (
            <>
              {sub(t("plannedHeading"))}
              <p className="mb-2 text-sm text-dark-slate/70">{t("plannedIntro")}</p>
              <dl className="flex flex-col gap-2 text-sm">
                {planned.map((f) => (
                  <div key={f}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{fieldLabels[`impactModel.${f}`] ?? f}</dt>
                    <dd className="whitespace-pre-line text-dark-slate/80">{impactModel![f] as string}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          {stepTasks("sdg_impact_measured")}
          {stepAi("sdg_impact_measured") && !followup?.story?.trim() && <ImpactAiHelp slug={slug} kind="story" field="story" />}
        </OverviewSection>
      </div>

      <div data-step="voice_shared" className="flex flex-col gap-5">
        <OverviewSection id="rost" introKey="aVoice" title={criterionLabel("voice_shared")} writingLabel={writing}>
          {stepIntro(t("voiceIntro"))}
          <VoiceForm key={keyOf(followup?.voiceQuote, followup?.voiceWho, String(followup?.voiceConsent))} slug={slug} quote={followup?.voiceQuote ?? null} who={followup?.voiceWho ?? null} consent={!!followup?.voiceConsent} canEdit={canEdit} />
          {stepTasks("voice_shared")}
        </OverviewSection>
      </div>

      <div data-step="impact_externally_verified" className="flex flex-col gap-5">
        <OverviewSection id="vem-har-sett" introKey="whoHasSeen" title={criterionLabel("impact_externally_verified")} writingLabel={writing}>
          {stepIntro(t("trustIntro"))}
          <ol className="mb-5 flex flex-col gap-2">
            {[1, 2, 3, 4].map((n) => (
              <li key={n} className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm ${level >= n ? "border-seagrass/40 bg-seagrass/10 text-dark-slate" : "border-muted-teal/30 text-dark-slate/50"}`}>
                <span aria-hidden className="w-16 shrink-0">{"⭐".repeat(n)}</span>
                <span>
                  <span className="font-semibold">{t(`trust${n}`)}</span> — {t(`trustHint${n}`)}
                </span>
                {level >= n && <span className="ml-auto text-xs font-semibold text-seagrass">✓</span>}
              </li>
            ))}
          </ol>
          <PlanFields
            key={keyOf(followup?.externalVerificationNotes)}
            slug={slug}
            canEdit={canEdit}
            save={saveImpactFollowup}
            fields={[{ key: "externalVerificationNotes", label: t("othersLabel"), value: followup?.externalVerificationNotes ?? null, placeholder: t("othersPlaceholder"), rows: 3 }]}
          />
          {sub(t("partnerHeading"))}
          <PartnerLinks slug={slug} canEdit={canEdit} hasStory={!!followup?.story?.trim()} links={partnerLinks} />
          <div className="mt-4">{toolLink("impact", t("sendForReview"))}</div>
          {stepTasks("impact_externally_verified")}
        </OverviewSection>
      </div>

      <div data-step="results_celebrated" className="flex flex-col gap-5">
        <OverviewSection id="tacka" introKey="thankAndShare" title={criterionLabel("results_celebrated")} fill={fill.lessons} writingLabel={writing} failedNote={<>{t("failed")}{retry("lessons")}</>}>
          {stepIntro(t("thankIntro"))}
          {canEdit ? (
            <ShareStory
              slug={slug}
              sharedOn={followup?.storySharedAt ? followup.storySharedAt.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB") : null}
              hasStory={!!followup?.story?.trim()}
              contributors={contributors.size}
            />
          ) : (
            followup?.storySharedAt && <p className="text-sm text-seagrass">✓ {t("sharedOn", { date: followup.storySharedAt.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB") })}</p>
          )}
          {sub(t("lessonsHeading"))}
          <PlanFields
            key={keyOf(followup?.celebrationNotes)}
            slug={slug}
            canEdit={canEdit}
            save={saveImpactFollowup}
            fields={[{ key: "celebrationNotes", label: t("lessonsLabel"), value: followup?.celebrationNotes ?? null, placeholder: t("lessonsPlaceholder"), rows: 5 }]}
          />
          {stepTasks("results_celebrated")}
          {stepAi("results_celebrated") && !followup?.celebrationNotes?.trim() && <ImpactAiHelp slug={slug} kind="lessons" field="celebrationNotes" />}
        </OverviewSection>
      </div>

      <div data-step="next_step_decided" className="flex flex-col gap-5">
        <OverviewSection id="nasta-steg" introKey="whatNow" title={criterionLabel("next_step_decided")} writingLabel={writing}>
          {notYet ? (
            <p className="text-sm text-dark-slate/60">{t("notYet")}</p>
          ) : (
            <NextStepSection slug={slug} brief={nextBrief?.content ?? null} current={DECISION_OPTION[decision]} canEdit={canEdit} isFounder={isFounder} aiAvailable={aiAvailable} />
          )}
          {decision === "CONTINUE" && (
            <div className="mt-5 rounded-xl border border-seagrass/30 bg-seagrass/5 p-4 text-sm text-dark-slate/80">
              <p className="mb-2">{t("afterContinue")}</p>
              {toolLink("edit", t("afterContinueLink"))}
            </div>
          )}
          {decision === "REPLICATE" && (
            <div className="mt-5 rounded-xl border border-seagrass/30 bg-seagrass/5 p-4 text-sm text-dark-slate/80">
              <p className="mb-2">{t("afterReplicate")}</p>
              {toolLink("skala?step=scale_vs_fork_decided", t("afterReplicateLink"))}
            </div>
          )}
          {decision === "CLOSE_RESPONSIBLY" && (
            <div className="mt-5 rounded-xl border border-muted-teal/30 bg-dry-sage/10 p-4 text-sm text-dark-slate/80">
              <p className="mb-2 font-semibold">{t("afterCloseHeading")}</p>
              <ul className="list-disc pl-5">
                {[1, 2, 3, 4].map((n) => <li key={n}>{t(`afterClose${n}`)}</li>)}
              </ul>
            </div>
          )}
          {stepTasks("next_step_decided")}
        </OverviewSection>
      </div>
      <PhaseSteps steps={steps} initialView={view === "all" ? "all" : "steps"} slug={slug} cardsByStep={{}} canEdit={false} />
    </div>
  );
}
