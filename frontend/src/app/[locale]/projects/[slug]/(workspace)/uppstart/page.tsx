import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCanvasFieldLabels } from "@/lib/canvasFieldLabels";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { latestInsight } from "@/lib/ideaInsights";
import { uppstartGateCriteria, MIN_TEST_FEEDBACK, type GateBrief } from "@/lib/phaseGate";
import { INITIATIVE_CHECKLIST_ITEMS } from "@/lib/projectPhase";
import { PHASE_ORDER } from "@/lib/sprints";
import { isUppstartFillInProgress, parseUppstartStatus, type UppstartFillStatus } from "@/lib/uppstartFill";
import AddOrInviteMember from "../../AddOrInviteMember";
import OverviewSection from "../ide/OverviewSection";
import { DraftCta, FieldGrid, FocusBox, GateClosed, OverviewHeader, TaskList, WikiHtml } from "../_overview/parts";
import RolesSection from "./RolesSection";
import DraftButton from "./DraftButton";
import PhaseGateSection from "../ide/PhaseGateSection";

// Which section of this page each Uppstart checklist step lives in.
const STEP_ANCHOR: Record<string, string> = {
  core_team_formed: "team",
  sprint_prepped: "sprint",
  kanban_seeded: "uppgifter",
  rough_budget_estimated: "plan",
  pilot_scope_defined: "plan",
};

// The checklist keys for the Design Sprint's five steps, in sprint order.
const SPRINT_STEP_KEYS = ["map_understand", "sketch_solutions", "decide_plan", "build_prototype", "test_with_users"];

// Uppstart on one page, same idea as the Idé overview: what the AI
// drafted after the gate (roles, sprint plan, first tasks, project plan),
// shown with a way to edit each part — and what only people can do:
// forming the team and running the sprint. The step-by-step guide stays.
export default async function UppstartOverviewPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [journeyOn, project] = await Promise.all([
    isFeatureEnabled("ai-project-start", session.user.id),
    prisma.project.findUnique({ where: { slug }, select: { id: true, phase: true, title: true } }),
  ]);
  if (!journeyOn) redirect(`/projects/${slug}/guide/pilot`);
  if (!project) notFound();

  const [t, tCheck, canEdit, aiAvailable, fillRow, brief, decision, done, roles, members, sprint, sprintPlan, cards, openCardCount, plan, tGate, fieldLabels, isFounder, gate, gateBrief, gateDecision] =
    await Promise.all([
      getTranslations({ locale, namespace: "UppstartOverview" }),
      getTranslations({ locale, namespace: "ProjectPhaseChecklist" }),
      hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES),
      isAiProjectStartAvailable(session.user.id),
      prisma.phaseFill.findUnique({ where: { projectId_phase: { projectId: project.id, phase: "PILOT" } } }),
      latestInsight<GateBrief>(project.id, "PHASE_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, fromPhase: { in: ["IDEA", "SPRINT"] }, outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
      prisma.initiativeChecklistItem.findMany({ where: { projectId: project.id, completedAt: { not: null } }, select: { itemKey: true } }),
      prisma.projectRoleNeed.findMany({
        where: { projectId: project.id },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, description: true, filledById: true, createdByAi: true },
      }),
      prisma.projectMember.findMany({
        where: { projectId: project.id, role: { not: "FOLLOWER" } },
        orderBy: { joinedAt: "asc" },
        select: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.sprint.findFirst({
        where: { projectSlug: slug },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, status: true, currentPhase: true },
      }),
      prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: slug, slug: "sprintplan" } }, select: { content: true } }),
      prisma.kanbanCard.findMany({
        where: { projectSlug: slug, column: { not: "DONE" } },
        orderBy: [{ createdAt: "desc" }],
        take: 8,
        select: { id: true, title: true, createdByAi: true },
      }),
      prisma.kanbanCard.count({ where: { projectSlug: slug, column: { not: "DONE" } } }),
      prisma.projectPlan.findUnique({ where: { projectSlug: slug } }),
      getTranslations({ locale, namespace: "PhaseGate" }),
      getCanvasFieldLabels(locale),
      hasProjectRole(project.id, session.user.id, ["FOUNDER"]),
      uppstartGateCriteria(project.id, slug),
      latestInsight<GateBrief>(project.id, "UPPSTART_GATE"),
      prisma.phaseGateDecision.findFirst({ where: { projectId: project.id, fromPhase: "PILOT" }, orderBy: { createdAt: "desc" } }),
    ]);

  const fill: UppstartFillStatus = fillRow ? parseUppstartStatus(fillRow.status, fillRow.updatedAt) : {};
  const doneKeys = new Set(done.map((d) => d.itemKey));
  const stillInIdea = project.phase === "IDEA" || project.phase === "SPRINT";
  const writing = t("writing");
  const retry = (section: string) => (canEdit && aiAvailable ? <> <DraftButton slug={slug} section={section} label={t("retry")} /></> : null);
  const memberOptions = members.map((m) => ({ id: m.user.id, name: m.user.name || m.user.email || "?" }));
  const steps = INITIATIVE_CHECKLIST_ITEMS.PILOT.filter((i) => !i.parentKey);
  const currentSprintIndex = sprint ? PHASE_ORDER.indexOf(sprint.currentPhase) : -1;
  const sprintStepState = (i: number): "done" | "current" | "upcoming" => {
    if (!sprint) return doneKeys.has(SPRINT_STEP_KEYS[i]) ? "done" : "upcoming";
    if (sprint.status === "COMPLETED" || i < currentSprintIndex || doneKeys.has(SPRINT_STEP_KEYS[i])) return "done";
    return i === currentSprintIndex ? "current" : "upcoming";
  };
  const criterionLabel = (key: string) => tCheck(key as Parameters<typeof tCheck>[0]);
  const decisionDate = (d: Date) => d.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const planFields = [
    ["goal", t("planGoal")],
    ["milestones", t("planMilestones")],
    ["resources", t("planResources")],
    ["risks", t("planRisks")],
  ] as const;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 py-6">
      <OverviewHeader
        heading={t("heading")}
        intro={isUppstartFillInProgress(fill) ? t("introWriting") : t("intro")}
        polling={isUppstartFillInProgress(fill)}
        stepByStep={{ href: `/projects/${slug}/guide/pilot`, label: t("stepByStep") }}
        notYet={stillInIdea ? { text: t("stillInIdea"), href: `/projects/${slug}/ide#fasgrind`, linkLabel: t("toGate") } : null}
        progressLabel={t("progressLabel")}
        steps={steps.map((st) => ({ key: st.key, label: tCheck(st.key as Parameters<typeof tCheck>[0]), done: doneKeys.has(st.key), anchor: STEP_ANCHOR[st.key] ?? "plan" }))}
        draftCta={
          !fillRow && canEdit && aiAvailable && !stillInIdea ? (
            <DraftCta text={t("draftIntro")}>
              <DraftButton slug={slug} label={t("draftAll")} variant="primary" />
            </DraftCta>
          ) : null
        }
      />

      <FocusBox heading={t("focusHeading")} items={brief?.content.nextFocus ?? []} note={decision?.note} />

      <OverviewSection
        id="team"
        title={t("teamHeading")}
        badge={t("yourTurn")}
        fill={fill.team}
        writingLabel={writing}
        failedNote={<>{t("failedTeam")}{retry("team")}</>}
        action={
          <Link href={`/projects/${slug}/members`} className="text-sm font-medium text-dark-slate/60 hover:text-coral">
            {t("allMembers")}
          </Link>
        }
      >
        <p className="mb-3 text-sm text-dark-slate/70">{t("teamIntro")}</p>
        <RolesSection slug={slug} roles={roles} members={memberOptions} canEdit={canEdit} />
        {canEdit && (
          <div className="mt-5 border-t border-muted-teal/20 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-dark-slate">{t("inviteHeading")}</h3>
            <AddOrInviteMember projectId={project.id} slug={slug} />
          </div>
        )}
      </OverviewSection>

      <OverviewSection
        id="sprint"
        title={t("sprintHeading")}
        badge={t("yourTurn")}
        fill={fill.sprint}
        writingLabel={writing}
        failedNote={<>{t("failedSprint")}{retry("sprint")}</>}
        action={
          sprint ? (
            <Link href={`/projects/${slug}/sprints/${sprint.id}`} className="text-sm font-medium text-dark-slate/60 hover:text-coral">
              {t("openSprint")}
            </Link>
          ) : (
            <Link href={`/projects/${slug}/sprints`} className="text-sm font-medium text-dark-slate/60 hover:text-coral">
              {t("manage")}
            </Link>
          )
        }
      >
        <p className="mb-3 text-sm text-dark-slate/70">{t("sprintIntro")}</p>
        <ol className="grid gap-2 sm:grid-cols-5">
          {SPRINT_STEP_KEYS.map((key, i) => {
            const state = sprintStepState(i);
            return (
              <li
                key={key}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  state === "done"
                    ? "border-seagrass/40 bg-seagrass/10 text-seagrass"
                    : state === "current"
                      ? "border-coral/50 bg-coral/5 text-dark-slate"
                      : "border-muted-teal/30 text-dark-slate/50"
                }`}
              >
                <span className="block font-semibold">
                  {state === "done" ? "✓ " : `${i + 1}. `}
                  {tCheck(key as Parameters<typeof tCheck>[0])}
                </span>
                {state === "current" && <span className="mt-0.5 block">{t("sprintNow")}</span>}
              </li>
            );
          })}
        </ol>
        {sprint && <p className="mt-3 text-sm text-dark-slate/70">{t("sprintName", { name: sprint.name })}</p>}
        {sprintPlan?.content ? (
          <div className="mt-4 rounded-xl border border-muted-teal/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-dark-slate">{t("sprintPlanHeading")}</h3>
              <Link href={`/projects/${slug}/wiki/sprintplan`} className="text-xs font-medium text-dark-slate/50 hover:text-coral">
                {canEdit ? t("edit") : t("open")}
              </Link>
            </div>
            <WikiHtml html={sprintPlan.content} />
          </div>
        ) : (
          !sprint && <p className="mt-3 text-sm text-dark-slate/50">{t("sprintEmpty")}</p>
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

      <OverviewSection
        id="plan"
        title={t("planHeading")}
        fill={fill.plan}
        writingLabel={writing}
        failedNote={<>{t("failedPlan")}{retry("plan")}</>}
        action={
          <Link href={`/projects/${slug}/project-plan`} className="text-sm font-medium text-dark-slate/60 hover:text-coral">
            {canEdit ? t("edit") : t("open")}
          </Link>
        }
      >
        <FieldGrid empty={t("planEmpty")} fields={planFields.map(([f, label]) => ({ key: f, label, value: plan?.[f] }))} />
      </OverviewSection>

      {project.phase === "PILOT" ? (
        <OverviewSection id="fasgrind" title={t("gateHeading")} badge={t("yourTurn")} writingLabel={writing}>
          <PhaseGateSection
            gate="uppstart"
            slug={slug}
            criteria={gate.criteria.map((c) => ({ ...c, label: criterionLabel(c.key) }))}
            countNote={{ key: "test_with_users", text: tGate("uppstart.feedbackOf", { count: gate.feedbackCount, min: MIN_TEST_FEEDBACK }) }}
            brief={gateBrief?.content ?? null}
            lastDecision={
              gateDecision
                ? { outcome: gateDecision.outcome, date: decisionDate(gateDecision.createdAt), missing: gateDecision.missing.map(criterionLabel) }
                : null
            }
            fieldLabels={fieldLabels}
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
