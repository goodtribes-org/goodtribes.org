import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

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

  const first = await prisma.channel.findFirst({
    where: { projectId: project.id },
    orderBy: { order: "asc" },
  });

  if (first) {
    redirect(`/projects/${slug}/kanaler/${first.id}`);
  }

  return (
    <div className="flex items-center justify-center h-64 text-dark-slate/50 text-sm">
      Inga kanaler ännu. Admins kan skapa kanaler.
    </div>
  );
}
