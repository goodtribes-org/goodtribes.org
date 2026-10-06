import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProjectRole, isLeadRole, isSiteAdmin } from "@/lib/authz";
import { publishMissing } from "@/lib/projectVisibility";
import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import DraftBanner from "./DraftBanner";

// Every page of a project goes through here, so this is where a draft
// (#226) is kept to its members and site admins — everyone else gets a 404,
// not a "private" page, so not even the draft's existence leaks.
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, title: true, summary: true, description: true, publishedAt: true },
  });
  // A missing project is the page's own notFound(), as before.
  if (!project || project.publishedAt) return <>{children}</>;

  await notFoundUnlessVisible(slug);
  const userId = (await auth())?.user?.id;

  const role = await getProjectRole(project.id, userId!);
  const canPublish = isLeadRole(role) || (await isSiteAdmin(userId!));
  return (
    <>
      <DraftBanner
        slug={slug}
        canPublish={canPublish}
        canDelete={project.ownerId === userId}
        missing={publishMissing(project)}
      />
      {children}
    </>
  );
}
