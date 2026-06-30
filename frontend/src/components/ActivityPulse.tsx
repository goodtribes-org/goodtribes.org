import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { timeAgo } from "@/lib/timeAgo";

type PulseItem = {
  id: string;
  emoji: string;
  bgClass: string;
  title: string;
  href: string;
  date: Date;
};

export default async function ActivityPulse() {
  const LIMIT = 5;

  const [blogPosts, milestones, projects, ideas, activities] = await Promise.all([
    prisma.blogPost.findMany({
      where: { project: { visibility: "public" } },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      select: {
        id: true,
        title: true,
        projectSlug: true,
        createdAt: true,
        author: { select: { name: true } },
        project: { select: { title: true } },
      },
    }),
    prisma.milestone.findMany({
      where: { status: "done", project: { visibility: "public" } },
      orderBy: { updatedAt: "desc" },
      take: LIMIT,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        project: { select: { title: true, slug: true } },
      },
    }),
    prisma.project.findMany({
      where: { visibility: "public" },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
      },
    }),
    prisma.idea.findMany({
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      select: {
        id: true,
        title: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    }),
    prisma.activityEvent.findMany({
      where: {
        type: { in: ["task_completed", "todo_completed", "member_joined"] },
        project: { visibility: "public" },
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT * 2,
      select: {
        id: true,
        type: true,
        createdAt: true,
        user: { select: { name: true } },
        project: { select: { title: true, slug: true } },
      },
    }),
  ]);

  const activityIcon: Record<string, { emoji: string; bg: string }> = {
    member_joined:  { emoji: "👤", bg: "bg-indigo-100" },
    task_completed: { emoji: "✅", bg: "bg-teal-100"   },
    todo_completed: { emoji: "☑️", bg: "bg-cyan-100"   },
  };

  const activityLabel: Record<string, (userName: string, projectTitle: string) => string> = {
    member_joined:  (u, p) => `${u} gick med i ${p}`,
    task_completed: (u, p) => `${u} slutförde en uppgift i ${p}`,
    todo_completed: (u, p) => `${u} checkade av en punkt i ${p}`,
  };

  const items: PulseItem[] = [
    ...blogPosts.map((p) => ({
      id: `blog-${p.id}`,
      emoji: "✍️",
      bgClass: "bg-blue-100",
      title: `${p.author.name ?? "Någon"} postade en uppdatering i ${p.project.title}`,
      href: `/projects/${p.projectSlug}/updates`,
      date: p.createdAt,
    })),
    ...milestones.map((m) => ({
      id: `milestone-${m.id}`,
      emoji: "🎯",
      bgClass: "bg-purple-100",
      title: `Milstolpe klar: ${m.title} i ${m.project.title}`,
      href: `/projects/${m.project.slug}/milestones`,
      date: m.updatedAt,
    })),
    ...projects.map((p) => ({
      id: `project-${p.id}`,
      emoji: "🚀",
      bgClass: "bg-green-100",
      title: `Nytt projekt: ${p.title}`,
      href: `/projects/${p.slug}`,
      date: p.createdAt,
    })),
    ...ideas.map((i) => ({
      id: `idea-${i.id}`,
      emoji: "💡",
      bgClass: "bg-yellow-100",
      title: `Ny idé: ${i.title}`,
      href: `/ideas/${i.id}`,
      date: i.createdAt,
    })),
    ...activities.map((a) => {
      const icon = activityIcon[a.type] ?? { emoji: "⚡", bg: "bg-orange-100" };
      const label = activityLabel[a.type];
      return {
        id: `activity-${a.id}`,
        emoji: icon.emoji,
        bgClass: icon.bg,
        title: label
          ? label(a.user.name ?? "Någon", a.project.title)
          : `Aktivitet i ${a.project.title}`,
        href: `/projects/${a.project.slug}`,
        date: a.createdAt,
      };
    }),
  ];

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  const displayed = items.slice(0, 10);

  if (displayed.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
      {displayed.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="flex-shrink-0 w-52 rounded-xl border border-muted-teal/40 bg-white hover:shadow-md hover:border-muted-teal transition-all p-3 flex flex-col gap-2"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${item.bgClass}`}>
            {item.emoji}
          </div>
          <p className="text-xs font-medium text-dark-slate leading-snug line-clamp-3 flex-1">{item.title}</p>
          <p className="text-[10px] text-dark-slate/40">{timeAgo(item.date)}</p>
        </Link>
      ))}
    </div>
  );
}
