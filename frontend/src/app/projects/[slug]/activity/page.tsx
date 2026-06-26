export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma"
import type { Metadata } from "next";


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Activity — GoodTribes.org` };
}

const EVENT_META: Record<string, { icon: string; label: (payload: Record<string, unknown>, actor: string) => string }> = {
  member_joined:        { icon: "👤", label: (_, a) => `${a} joined the project` },
  update_posted:        { icon: "📝", label: (p, a) => `${a} posted an update: "${p.title}"` },
  milestone_added:      { icon: "🏁", label: (p, a) => `${a} added milestone: "${p.title}"` },
  milestone_completed:  { icon: "✅", label: (p, a) => `${a} completed milestone: "${p.title}"` },
};

function timeAgo(date: Date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

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

      {events.length === 0 ? (
        <p className="text-sm text-dark-slate/40 py-8 text-center">No activity yet.</p>
      ) : (
        <ol className="relative border-l border-muted-teal/30 ml-3 space-y-0">
          {events.map((event) => {
            const meta = EVENT_META[event.type];
            const actor = event.user.name ?? "Someone";
            const payload = (event.payload ?? {}) as Record<string, unknown>;
            const label = meta?.label(payload, actor) ?? `${actor} did something`;
            const icon = meta?.icon ?? "🔔";
            return (
              <li key={event.id} className="mb-6 ml-5">
                <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-white border border-muted-teal/40 text-sm">
                  {icon}
                </span>
                <p className="text-sm text-dark-slate leading-snug">{label}</p>
                <time className="text-xs text-dark-slate/40">{timeAgo(event.createdAt)}</time>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
