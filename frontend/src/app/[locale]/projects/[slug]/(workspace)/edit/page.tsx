import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import EditProjectForm from "./EditProjectForm";
import DeleteProjectButton from "@/components/DeleteProjectButton";
import { isLeadRole } from "@/lib/authz";
import { parseColumnMap, parseStatusOptions } from "@/lib/githubColumnMap";


export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [project, skills, userOrgs] = await Promise.all([
    prisma.project.findUnique({
      where: { slug },
      include: {
        members: { where: { userId: session.user.id } },
        neededSkills: { select: { skillId: true } },
        githubBoard: true,
        ownershipInterests: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
    }),
    prisma.skill.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
    prisma.organisation.findMany({
      where: { OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!project) redirect("/projects");

  const graduationRequest = project.isSandbox
    ? await prisma.sandboxGraduationRequest.findFirst({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
        select: { status: true, decisionNote: true },
      })
    : null;

  const checklistItems =
    project.phase === "IDEA" || project.phase === "SPRINT"
      ? await prisma.initiativeChecklistItem.findMany({
          where: { projectId: project.id, completedAt: { not: null } },
          select: { itemKey: true },
        })
      : [];

  const role = project.members[0]?.role;
  if (!isLeadRole(role)) redirect(`/projects/${slug}`);

  const isOwner = role === "FOUNDER";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <a href={`/projects/${slug}`} className="text-sm text-dark-slate/50 hover:text-seagrass">
          ← {project.title}
        </a>
        <h1 className="text-2xl font-bold mt-1">Edit project</h1>
      </div>
      <EditProjectForm
        slug={slug}
        skills={skills}
        orgs={userOrgs}
        currentSkillIds={project.neededSkills.map((s) => s.skillId)}
        currentOrgId={project.orgId}
        github={
          project.githubBoard
            ? {
                projectInput:
                  project.githubBoard.projectUrl ??
                  `${project.githubBoard.ownerLogin}/${project.githubBoard.projectNumber}`,
                projectTitle: project.githubBoard.projectTitle,
                statusOptions: parseStatusOptions(project.githubBoard.statusOptions),
                columnMap: parseColumnMap(project.githubBoard.columnMap),
                lastSyncedAt: project.githubBoard.lastSyncedAt?.toISOString() ?? null,
                lastSyncError: project.githubBoard.lastSyncError,
              }
            : null
        }
        initial={{
          title: project.title,
          summary: (project as typeof project & { summary: string | null }).summary,
          description: project.description,
          phase: project.phase,
          isSandbox: project.isSandbox,
          abandonedAt: project.abandonedAt?.toISOString() ?? null,
          visibility: project.visibility,
          category: project.category,
          tags: project.tags,
          sdgGoals: project.sdgGoals,
          imageUrl: project.imageUrl,
        }}
        completedChecklistKeys={checklistItems.map((c) => c.itemKey)}
        graduationRequest={graduationRequest}
        ownershipInterests={project.ownershipInterests.map((i) => ({
          id: i.id,
          user: i.user,
          message: i.message,
          createdAt: i.createdAt.toISOString(),
        }))}
      />
      {isOwner && (
        <div className="mt-12 pt-8 border-t border-red-200">
          <h2 className="text-sm font-semibold text-red-700 mb-2">Danger zone</h2>
          <p className="text-xs text-dark-slate/60 mb-4">
            Deleting a project permanently removes all kanban cards, todos, wiki pages, milestones, and activity. This cannot be undone.
          </p>
          <DeleteProjectButton slug={slug} />
        </div>
      )}
    </div>
  );
}
