import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProjectTopNav from "../ProjectTopNav";
import ProjectSideNav from "../ProjectSideNav";
import HubTabs from "../HubTabs";
import PhaseProgressStrip from "../PhaseProgressStrip";
import { ProjectSandboxAnnouncer } from "@/components/SandboxIndicator";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isCommercialLegalType } from "@/lib/legalType";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, project] = await Promise.all([
    auth(),
    prisma.project.findUnique({ where: { slug }, select: { id: true, title: true, legalType: true, isSandbox: true, phase: true } }),
  ]);
  if (!project) notFound();

  const [isOwner, checklistItems] = await Promise.all([
    session?.user?.id
      ? hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
      : Promise.resolve(false),
    prisma.initiativeChecklistItem.findMany({
      where: { projectId: project.id, completedAt: { not: null } },
      select: { itemKey: true },
    }),
  ]);

  return (
    <>
      <ProjectSandboxAnnouncer isSandbox={project.isSandbox} />
      <ProjectTopNav
        slug={slug}
        title={project.title}
        isOwner={isOwner}
        isCommercial={isCommercialLegalType(project.legalType)}
        phase={project.phase}
        completedChecklistKeys={checklistItems.map((c) => c.itemKey)}
        phaseStrip={<PhaseProgressStrip projectId={project.id} slug={slug} viewing={project.phase} inHeader />}
      />
      {/* Full-bleed, as before the side rail was removed: pages that fill the
          width (Att göra, Färdplan, ...) keep doing so; pages with their own
          max-width still centre themselves. On desktop it also cancels the
          <main>'s top/bottom padding (pt-8/pb-12) and grows to fill it, so
          the side menu runs from the header's line down to the footer's. */}
      <div className="flex flex-1 lg:-mt-8 lg:-mb-12" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
        <ProjectSideNav
          slug={slug}
          isOwner={isOwner}
          isCommercial={isCommercialLegalType(project.legalType)}
          phase={project.phase}
          completedChecklistKeys={checklistItems.map((c) => c.itemKey)}
          topOffset={0}
        />
        <div className="flex-1 min-w-0 px-6 lg:pt-8 lg:pb-12">
          <HubTabs slug={slug} isCommercial={isCommercialLegalType(project.legalType)} />
          {children}
        </div>
      </div>
    </>
  );
}
