import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import EditProjectForm from "./EditProjectForm";

const prisma = new PrismaClient();

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { slug },
    include: { members: { where: { userId: session.user.id } } },
  });
  if (!project) redirect("/projects");

  const role = project.members[0]?.role;
  if (!role || !["owner", "admin"].includes(role)) redirect(`/projects/${slug}`);

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
        initial={{
          title: project.title,
          description: project.description,
          status: project.status,
          visibility: project.visibility,
          category: project.category,
          tags: project.tags,
          sdgGoals: project.sdgGoals,
        }}
      />
    </div>
  );
}
