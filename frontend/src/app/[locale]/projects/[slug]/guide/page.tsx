import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isLeadRole } from "@/lib/authz";
import IdeaGuide from "./IdeaGuide";
import PhaseMenuBar from "../PhaseMenuBar";

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
      leanCanvas: true,
      valueProposition: true,
    },
  });
  if (!project) redirect("/projects");
  if (!isLeadRole(project.members[0]?.role)) redirect(`/projects/${slug}`);

  // Ground truth for whether the "Bjud in vänner" step has real work behind
  // it — unlike SDG selection or the Lean Canvas, there's no other field to
  // check this against, so it's computed here rather than trusted from
  // completedKeys (which older guide versions marked unconditionally).
  const [memberCount, pendingInviteCount] = await Promise.all([
    prisma.projectMember.count({ where: { projectId: project.id } }),
    prisma.projectInvite.count({ where: { projectId: project.id, usedAt: null } }),
  ]);
  const hasInvitedSomeone = memberCount > 1 || pendingInviteCount > 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <PhaseMenuBar
          slug={slug}
          phase={project.phase}
          completedKeys={project.checklistItems.map((c) => c.itemKey)}
          canEdit={true}
          viewingPhase="IDEA"
        />
      </div>
      <IdeaGuide
        projectId={project.id}
        slug={slug}
        title={project.title}
        initialSummary={project.summary ?? ""}
        initialDescription={project.description ?? ""}
        initialCategory={project.category ?? ""}
        initialTags={project.tags}
        initialImageUrl={project.imageUrl ?? ""}
        initialSdgGoals={project.sdgGoals}
        completedKeys={project.checklistItems.map((c) => c.itemKey)}
        leanCanvas={project.leanCanvas}
        valueProposition={project.valueProposition}
        hasInvitedSomeone={hasInvitedSomeone}
      />
    </div>
  );
}
