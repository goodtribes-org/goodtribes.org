import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProjectSideNav from "../ProjectSideNav";
import ProjectMiniHero from "../ProjectMiniHero";
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
    prisma.project.findUnique({ where: { slug }, select: { id: true, title: true, imageUrl: true, legalType: true } }),
  ]);
  if (!project) notFound();

  const isOwner = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;

  return (
    <>
      <ProjectMiniHero title={project.title} imageUrl={project.imageUrl} />
      <div className="flex flex-col sm:flex-row pt-8 pb-12" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
        <ProjectSideNav slug={slug} isOwner={isOwner} isCommercial={isCommercialLegalType(project.legalType)} />
        <div className="flex-1 min-w-0 px-6">{children}</div>
      </div>
    </>
  );
}
