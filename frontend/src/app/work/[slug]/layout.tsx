import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation";
import WorkspaceTabNav from "@/components/WorkspaceTabNav";


export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const org = await prisma.organisation.findUnique({
    where: { slug },
    select: { id: true, name: true, ownerId: true },
  });
  if (!org) notFound();

  const member = await prisma.organisationMember.findUnique({
    where: { organisationId_userId: { organisationId: org.id, userId } },
    select: { role: true },
  });

  if (org.ownerId !== userId && !member) {
    redirect(`/org/${slug}`);
  }

  const isAdmin = org.ownerId === userId || member?.role === "admin";

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-dark-slate/50 mb-1">Workspace</p>
        <h1 className="text-3xl font-bold">{org.name}</h1>
      </div>
      <WorkspaceTabNav slug={slug} isAdmin={!!isAdmin} />
      {children}
    </div>
  );
}
