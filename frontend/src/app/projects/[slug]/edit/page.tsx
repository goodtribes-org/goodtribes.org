import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import EditProjectForm from "./EditProjectForm";
import DeleteProjectButton from "@/components/DeleteProjectButton";

const prisma = new PrismaClient();

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [project, skills] = await Promise.all([
    prisma.project.findUnique({
      where: { slug },
      include: {
        members: { where: { userId: session.user.id } },
        neededSkills: { select: { skillId: true } },
      },
    }),
    prisma.skill.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
  ]);
  if (!project) redirect("/projects");

  const role = project.members[0]?.role;
  if (!role || !["owner", "admin"].includes(role)) redirect(`/projects/${slug}`);

  const isOwner = role === "owner";

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
        currentSkillIds={project.neededSkills.map((s) => s.skillId)}
        initial={{
          title: project.title,
          description: project.description,
          status: project.status,
          visibility: project.visibility,
          category: project.category,
          tags: project.tags,
          sdgGoals: project.sdgGoals,
          imageUrl: project.imageUrl,
        }}
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
