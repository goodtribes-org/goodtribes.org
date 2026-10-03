import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isLeadRole } from "@/lib/authz";
import IdeaGuide from "./IdeaGuide";
import { getAutoDoneKeys } from "@/lib/projectSignals";
import PhaseMenuBar from "../PhaseMenuBar";
import { IDEA_GUIDE_STEPS } from "@/lib/ideaGuideSteps";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { getProjectAiSettings, resolveAiMode } from "@/lib/aiMode";
import { getCanvasAiContext } from "@/lib/canvasAi";
import { parseOpenQuestions } from "@/lib/dreamConversation";

export default async function IdeaGuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { slug } = await params;
  const { step } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      members: { where: { userId: session.user.id } },
      checklistItems: { where: { completedAt: { not: null } }, select: { itemKey: true } },
      leanCanvas: true,
      valueProposition: true,
    },
  });
  if (!project) redirect("/projects");
  if (!isLeadRole(project.members[0]?.role)) redirect(`/projects/${slug}`);

  // Ground truth for whether the interview and market-scan steps have real
  // work behind them, computed here rather than trusted from completedKeys.
  const [interviewCount, marketScanCount] = await Promise.all([
    prisma.interviewLogEntry.count({ where: { projectSlug: slug } }),
    prisma.marketScanEntry.count({ where: { projectSlug: slug } }),
  ]);

  // Per-step AI mode pickers ship dark behind the ai-project-start flag.
  // vet/antar marking on the canvas steps ships behind the same flag.
  // AI mode pickers and "Prata med AI:n" additionally need an Anthropic key
  // (isAiProjectStartAvailable); marking, suggestions and open questions don't.
  const aiFeatures = await isFeatureEnabled("ai-project-start", session.user.id);
  const aiAvailable = aiFeatures && (await isAiProjectStartAvailable(session.user.id));
  const [aiSettings, leanCanvasAi, valuePropositionAi, dream] = aiFeatures
    ? await Promise.all([
        aiAvailable ? getProjectAiSettings(project.id) : null,
        getCanvasAiContext(project.id, "leanCanvas"),
        getCanvasAiContext(project.id, "valueProposition"),
        prisma.dreamConversation.findUnique({ where: { projectId: project.id }, select: { openQuestions: true } }),
      ])
    : [null, null, null, null];
  // "Prata med AI:n" is offered when the project has no Drömsamtal yet and
  // its AI mode for describing the project isn't MANUAL.
  const canStartDream =
    aiAvailable && !dream && (await resolveAiMode({ projectId: project.id, feature: "dream-conversation", stepKey: "dream_defined" })).mode !== "MANUAL";

  const autoDoneKeys = await getAutoDoneKeys(project.id, slug);
  return (
    <div className="max-w-5xl mx-auto min-w-0 w-full">
      <div className="mb-8">
        <PhaseMenuBar
          slug={slug}
          phase={project.phase}
          completedKeys={project.checklistItems.map((c) => c.itemKey)}
          autoDoneKeys={autoDoneKeys}
          canEdit={true}
          showNextStep
          viewingPhase="IDEA"
          showOverviews={aiFeatures}
        />
      </div>
      <IdeaGuide
        slug={slug}
        title={project.title}
        initialSummary={project.summary ?? ""}
        initialDescription={project.description ?? ""}
        initialCategory={project.category ?? ""}
        initialTags={project.tags}
        initialImageUrl={project.imageUrl ?? ""}
        initialSdgGoals={project.sdgGoals}
        completedKeys={project.checklistItems.map((c) => c.itemKey)}
        autoDoneKeys={autoDoneKeys}
        leanCanvas={project.leanCanvas}
        valueProposition={project.valueProposition}
        hasInterviews={interviewCount > 0}
        hasMarketScan={marketScanCount > 0}
        initialStep={Math.max(0, IDEA_GUIDE_STEPS.findIndex((i) => i.key === step))}
        aiSettings={aiSettings}
        leanCanvasAi={leanCanvasAi}
        valuePropositionAi={valuePropositionAi}
        canStartDream={canStartDream}
        openQuestions={dream ? parseOpenQuestions(dream.openQuestions) : undefined}
        sdgGuidance={aiFeatures}
        hasOverview={!!dream}
      />
    </div>
  );
}
