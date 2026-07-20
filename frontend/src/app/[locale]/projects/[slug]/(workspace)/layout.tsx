import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProjectTabNav from "../ProjectTabNav";
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
    prisma.project.findUnique({ where: { slug }, select: { id: true, legalType: true } }),
  ]);
  if (!project) notFound();

  const isOwner = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;

  return (
    <>
      <div
        className="mb-6"
        style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
      >
        <div className="px-6">
          <ProjectTabNav slug={slug} isOwner={isOwner} isCommercial={isCommercialLegalType(project.legalType)} />
        </div>
      </div>
      {children}
    </>
  );
}
