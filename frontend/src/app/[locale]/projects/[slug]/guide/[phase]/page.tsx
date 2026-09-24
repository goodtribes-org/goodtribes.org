import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isLeadRole } from "@/lib/authz";
import { INITIATIVE_CHECKLIST_ITEMS, type ProjectPhaseValue } from "@/lib/projectPhase";
import PhaseGuide from "./PhaseGuide";
import PhaseMenuBar from "../../PhaseMenuBar";
import { Link } from "@/i18n/navigation";
import { isFeatureEnabled } from "@/lib/featureFlags";

// Idé has its own bespoke guide (see ../page.tsx and ../IdeaGuide.tsx) —
// this generic, checklist-driven guide covers every phase after it.
const GUIDE_PHASES: ProjectPhaseValue[] = ["PILOT", "PRODUCTION", "ESTABLISH", "SCALE", "IMPACT"];

export default async function PhaseGuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string; phase: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { locale, slug, phase: phaseParam } = await params;
  const { step } = await searchParams;
  const phase = phaseParam.toUpperCase() as ProjectPhaseValue;
  if (!GUIDE_PHASES.includes(phase)) notFound();
  const tPhase = await getTranslations({ locale, namespace: "ProjectPhase" });

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      members: { where: { userId: session.user.id } },
      checklistItems: { where: { completedAt: { not: null } }, select: { itemKey: true } },
    },
  });
  if (!project) redirect("/projects");
  if (!isLeadRole(project.members[0]?.role)) redirect(`/projects/${slug}`);
  // Phases from Uppstart on also have a one-page overview (see
  // (workspace)/uppstart, lansering, etablera, …).
  const ONE_PAGE: Partial<Record<ProjectPhaseValue, { href: string; namespace: "UppstartOverview" | "LanseringOverview" | "EtableraOverview" | "SkalaOverview" | "ImpactOverview" }>> = {
    PILOT: { href: "uppstart", namespace: "UppstartOverview" },
    PRODUCTION: { href: "lansering", namespace: "LanseringOverview" },
    ESTABLISH: { href: "etablera", namespace: "EtableraOverview" },
    SCALE: { href: "skala", namespace: "SkalaOverview" },
    IMPACT: { href: "impactfasen", namespace: "ImpactOverview" },
  };
  const journeyOn = await isFeatureEnabled("ai-project-start", session.user.id);
  const onePage = ONE_PAGE[phase] && journeyOn ? ONE_PAGE[phase] : null;
  const tOnePage = await getTranslations({ locale, namespace: onePage?.namespace ?? "UppstartOverview" });

  return (
    <div className="max-w-5xl mx-auto min-w-0 w-full">
      <div className="mb-8">
        <PhaseMenuBar
          slug={slug}
          phase={project.phase}
          completedKeys={project.checklistItems.map((c) => c.itemKey)}
          canEdit={true}
          viewingPhase={phase}
          showOverviews={journeyOn}
        />
      </div>
      <div className="max-w-3xl mx-auto">
        {onePage && (
          <Link
            href={`/projects/${slug}/${onePage.href}`}
            className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-seagrass/30 bg-seagrass/5 px-4 py-3 text-sm font-medium text-seagrass hover:bg-seagrass/10"
          >
            {tOnePage("onePageLink")} <span aria-hidden>→</span>
          </Link>
        )}
        <PhaseGuide
          slug={slug}
          phase={phase}
          phaseLabel={tPhase(phase)}
          projectTitle={project.title}
          items={INITIATIVE_CHECKLIST_ITEMS[phase]}
          completedKeys={project.checklistItems.map((c) => c.itemKey)}
          initialStepIndex={Math.max(0, INITIATIVE_CHECKLIST_ITEMS[phase].findIndex((i) => i.key === step))}
        />
      </div>
    </div>
  );
}
