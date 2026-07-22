import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isLeadRole } from "@/lib/authz";
import IdeaGuide from "./IdeaGuide";

export default async function IdeaGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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

  return (
    <div className="max-w-2xl mx-auto">
      <IdeaGuide
        projectId={project.id}
        slug={slug}
        title={project.title}
        initialSummary={project.summary ?? ""}
        initialDescription={project.description ?? ""}
        initialSdgGoals={project.sdgGoals}
        initialLegalType={project.legalType}
        completedKeys={project.checklistItems.map((c) => c.itemKey)}
      />
    </div>
  );
}
