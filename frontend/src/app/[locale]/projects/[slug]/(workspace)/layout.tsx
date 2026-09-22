import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProjectTopNav from "../ProjectTopNav";
import ProjectMiniHero from "../ProjectMiniHero";
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
    prisma.project.findUnique({ where: { slug }, select: { id: true, title: true, imageUrl: true, legalType: true, isSandbox: true, phase: true } }),
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
      />
      <ProjectMiniHero title={project.title} imageUrl={project.imageUrl} />
      <div className="flex-1 min-w-0 pt-8">{children}</div>
    </>
  );
}
