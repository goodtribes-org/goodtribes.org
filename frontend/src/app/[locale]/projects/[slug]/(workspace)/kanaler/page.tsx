import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { isLeadRole } from "@/lib/authz";

export default async function KanalerIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!project) notFound();

  let first = await prisma.channel.findFirst({
    where: { projectId: project.id },
    orderBy: { order: "asc" },
  });

  // Auto-seed default channels for project owners on first visit
  if (!first) {
    const session = await auth();
    if (session?.user?.id) {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: project.id, userId: session.user.id } },
        select: { role: true },
      });
      if (isLeadRole(member?.role)) {
        await prisma.channel.createMany({
          data: [
            { projectId: project.id, name: "allmänt", type: "text",         order: 0 },
            { projectId: project.id, name: "beslut",  type: "announcement", order: 1 },
            { projectId: project.id, name: "ideer",   type: "text",         order: 2 },
          ],
        });
        first = await prisma.channel.findFirst({
          where: { projectId: project.id },
          orderBy: { order: "asc" },
        });
      }
    }
  }

  if (first) {
    redirect(`/projects/${slug}/kanaler/${first.id}`);
  }

  return (
    <div className="flex items-center justify-center h-64 text-dark-slate/50 text-sm">
      Inga kanaler ännu. Admins kan skapa kanaler.
    </div>
  );
}
