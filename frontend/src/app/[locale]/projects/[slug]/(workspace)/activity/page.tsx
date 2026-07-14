export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma"
import type { Metadata } from "next";
import ActivityTimeline, { type EventMeta } from "@/components/ActivityTimeline";


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Activity — GoodTribes.org` };
}

const EVENT_META: EventMeta = {
  member_joined:        { icon: "👤", label: (_, a) => `${a} joined the project` },
  update_posted:        { icon: "📝", label: (p, a) => `${a} posted an update: "${p.title}"` },
  milestone_added:      { icon: "🏁", label: (p, a) => `${a} added milestone: "${p.title}"` },
  milestone_completed:  { icon: "✅", label: (p, a) => `${a} completed milestone: "${p.title}"` },
};

export default async function ActivityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true, id: true } });
  if (!project) notFound();

  const events = await prisma.activityEvent.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true } } },
  });

  return (
    <div>
      <div className="mb-4">
        <Link href={`/projects/${slug}`} className="text-xs text-dark-slate/40 hover:text-dark-slate">
          ← {project.title}
        </Link>
        <h1 className="text-xl font-bold text-dark-slate mt-0.5">Activity</h1>
      </div>

      <ActivityTimeline events={events} eventMeta={EVENT_META} />
    </div>
  );
}
