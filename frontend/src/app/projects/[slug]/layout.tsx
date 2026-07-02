import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProjectTabNav from "./ProjectTabNav";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, project] = await Promise.all([
    auth(),
    prisma.project.findUnique({ where: { slug }, select: { id: true } }),
  ]);
  if (!project) notFound();

  const isOwnerRecord = session?.user?.id
    ? await prisma.projectMember.findFirst({
        where: { project: { slug }, userId: session.user.id, role: { in: ["owner", "admin"] } },
      })
    : null;
  const isOwner = !!isOwnerRecord;

  return (
    <>
      <div
        className="mb-6 border-b border-muted-teal/20"
        style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
      >
        <div className="px-6">
          <ProjectTabNav slug={slug} isOwner={isOwner} />
        </div>
      </div>

      {children}
    </>
  );
}
