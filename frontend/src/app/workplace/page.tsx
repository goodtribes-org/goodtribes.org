export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Workplace — GoodTribes.org" };

const prisma = new PrismaClient();

const STATUS_LABEL: Record<string, string> = {
  concept: "Concept",
  prototype: "Prototype",
  production: "In Production",
  delivery: "Delivered",
};

const STATUS_COLOR: Record<string, string> = {
  concept: "bg-dry-sage/40 text-dark-slate/70",
  prototype: "bg-yellow-100 text-yellow-800",
  production: "bg-blue-100 text-blue-800",
  delivery: "bg-green-100 text-green-800",
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  collaborator: "Collaborator",
  follower: "Follower",
};

function formatDue(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due in ${diff}d`;
}

function isDueSoon(date: Date | null): boolean {
  if (!date) return false;
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  return diff <= 2;
}

const ACTIVITY_ICON: Record<string, string> = {
  member_joined: "👋",
  update_posted: "✍️",
  milestone_added: "🎯",
  milestone_completed: "✅",
};

const ACTIVITY_LABEL: Record<string, string> = {
  member_joined: "Gick med i",
  update_posted: "Publicerade en uppdatering i",
  milestone_added: "Lade till milstolpe i",
  milestone_completed: "Slutförde en milstolpe i",
};

function activityIcon(type: string): string {
  return ACTIVITY_ICON[type] ?? "📌";
}

function activityDescription(type: string, projectTitle: string): string {
  const label = ACTIVITY_LABEL[type] ?? type;
  return `${label} ${projectTitle}`;
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 24) return diffH <= 1 ? "1 timme sedan" : `${diffH} timmar sedan`;
  const diffD = Math.floor(diffMs / 86400000);
  return diffD === 1 ? "1 dag sedan" : `${diffD} dagar sedan`;
}

function activityDateGroup(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000);

  if (d >= todayStart) return "Idag";
  if (d >= yesterdayStart) return "Igår";
  if (d >= weekStart) return "Denna vecka";
  return "Tidigare";
}

const TABS = [
  { key: "overview", label: "Översikt" },
  { key: "activity", label: "Min aktivitet" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function WorkplacePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const resolvedParams = await searchParams;
  const activeTab: TabKey =
    resolvedParams.tab === "activity" ? "activity" : "overview";

  // Data needed for both tabs (overview header always visible)
  const [memberships, openKanban, openTodos, myIdeas] = await Promise.all([
    prisma.projectMember.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      include: {
        project: {
          include: {
            _count: {
              select: {
                kanbanCards: { where: { column: { not: "DONE" } } },
                todoItems: { where: { done: false } },
                members: true,
              },
            },
          },
        },
      },
    }),
    prisma.kanbanCard.findMany({
      where: {
        project: { members: { some: { userId } } },
        column: { not: "DONE" },
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 15,
      include: { project: { select: { title: true, slug: true } } },
    }),
    prisma.todoItem.findMany({
      where: {
        project: { members: { some: { userId } } },
        done: false,
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 15,
      include: { project: { select: { title: true, slug: true } } },
    }),
    prisma.idea.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { votes: true, comments: true } } },
    }),
  ]);

  // Activity tab data
  let activityEvents: {
    id: string;
    type: string;
    createdAt: Date;
    project: { title: string; slug: string };
  }[] = [];
  let distinctProjectCount = 0;
  let activitiesThisMonth = 0;
  let ideasCount = 0;

  if (activeTab === "activity") {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [events, projectCountResult, monthCountResult, ideasCountResult] =
      await Promise.all([
        prisma.activityEvent.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { project: { select: { title: true, slug: true } } },
        }),
        prisma.activityEvent.findMany({
          where: { userId },
          select: { projectId: true },
          distinct: ["projectId"],
        }),
        prisma.activityEvent.count({
          where: { userId, createdAt: { gte: monthStart } },
        }),
        prisma.idea.count({ where: { authorId: userId } }),
      ]);

    activityEvents = events;
    distinctProjectCount = projectCountResult.length;
    activitiesThisMonth = monthCountResult;
    ideasCount = ideasCountResult;
  }

  const totalOpenTasks =
    memberships.reduce(
      (sum, m) =>
        sum + m.project._count.kanbanCards + m.project._count.todoItems,
      0
    );

  type TaskRow =
    | { kind: "kanban"; id: string; title: string; project: { title: string; slug: string }; dueDate: Date | null; column: string }
    | { kind: "todo"; id: string; title: string; project: { title: string; slug: string }; dueDate: Date | null };

  const allTasks: TaskRow[] = [
    ...openKanban.map((c) => ({
      kind: "kanban" as const,
      id: c.id,
      title: c.title,
      project: c.project,
      dueDate: c.dueDate,
      column: c.column,
    })),
    ...openTodos.map((t) => ({
      kind: "todo" as const,
      id: t.id,
      title: t.title,
      project: t.project,
      dueDate: t.dueDate,
    })),
  ]
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    })
    .slice(0, 15);

  // Group activity events by date label
  const groupedEvents: { label: string; events: typeof activityEvents }[] = [];
  const ORDER = ["Idag", "Igår", "Denna vecka", "Tidigare"];
  for (const event of activityEvents) {
    const label = activityDateGroup(event.createdAt);
    let group = groupedEvents.find((g) => g.label === label);
    if (!group) {
      group = { label, events: [] };
      groupedEvents.push(group);
    }
    group.events.push(event);
  }
  groupedEvents.sort((a, b) => ORDER.indexOf(a.label) - ORDER.indexOf(b.label));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Hello{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-dark-slate/60 mt-1">
            {memberships.length} project{memberships.length !== 1 ? "s" : ""} &nbsp;·&nbsp;{" "}
            {totalOpenTasks} open task{totalOpenTasks !== 1 ? "s" : ""} &nbsp;·&nbsp;{" "}
            {myIdeas.length} idea{myIdeas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors"
        >
          + New project
        </Link>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-muted-teal">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.key === "overview" ? "/workplace" : `/workplace?tab=${tab.key}`}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-seagrass text-seagrass"
                  : "border-transparent text-dark-slate/50 hover:text-dark-slate hover:border-muted-teal"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tab: Oversikt */}
      {activeTab === "overview" && (
        <div className="space-y-12">
          {/* My Projects */}
          <section>
            <h2 className="text-xl font-semibold mb-4">My projects</h2>
            {memberships.length === 0 ? (
              <div className="border border-dashed border-muted-teal rounded-lg p-10 text-center">
                <p className="text-dark-slate/50 mb-3">You haven&apos;t joined any projects yet.</p>
                <Link href="/projects" className="text-seagrass hover:underline text-sm">
                  Explore projects →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {memberships.map(({ role, project }) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.slug}`}
                    className="border border-muted-teal rounded-lg p-5 hover:border-seagrass hover:shadow-sm transition-all flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-dark-slate leading-tight">{project.title}</h3>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLOR[project.status] ?? STATUS_COLOR.concept}`}
                      >
                        {STATUS_LABEL[project.status] ?? project.status}
                      </span>
                    </div>
                    {project.description && (
                      <p className="text-sm text-dark-slate/60 line-clamp-2">{project.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-dark-slate/50 mt-auto pt-1 border-t border-muted-teal/40">
                      <span className="font-medium text-seagrass">{ROLE_LABEL[role] ?? role}</span>
                      <span>{project._count.kanbanCards} Kanban</span>
                      <span>{project._count.todoItems} todos</span>
                      <span>{project._count.members} member{project._count.members !== 1 ? "s" : ""}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Open Tasks */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Open tasks</h2>
            {allTasks.length === 0 ? (
              <p className="text-dark-slate/50 italic text-sm">No open tasks across your projects.</p>
            ) : (
              <div className="border border-muted-teal rounded-lg overflow-hidden divide-y divide-muted-teal/50">
                {allTasks.map((task) => (
                  <Link
                    key={`${task.kind}-${task.id}`}
                    href={
                      task.kind === "kanban"
                        ? `/projects/${task.project.slug}/kanban`
                        : `/projects/${task.project.slug}/todos`
                    }
                    className="flex items-center gap-3 px-4 py-3 hover:bg-dry-sage/20 transition-colors"
                  >
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider w-12 flex-shrink-0 ${
                        task.kind === "kanban" ? "text-coral" : "text-seagrass"
                      }`}
                    >
                      {task.kind === "kanban" ? "Board" : "Todo"}
                    </span>
                    <span className="flex-1 text-sm text-dark-slate truncate">{task.title}</span>
                    <span className="text-xs text-dark-slate/40 flex-shrink-0">
                      {task.project.title}
                    </span>
                    {task.dueDate && (
                      <span
                        className={`text-xs flex-shrink-0 font-medium ${
                          isDueSoon(task.dueDate) ? "text-coral" : "text-dark-slate/40"
                        }`}
                      >
                        {formatDue(task.dueDate)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* My Ideas */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">My ideas</h2>
              <Link href="/ideas/new" className="text-seagrass hover:underline text-sm">
                + Share idea
              </Link>
            </div>
            {myIdeas.length === 0 ? (
              <p className="text-dark-slate/50 italic text-sm">
                You haven&apos;t shared any ideas yet.{" "}
                <Link href="/ideas" className="text-seagrass hover:underline">
                  Browse the idea feed
                </Link>
              </p>
            ) : (
              <div className="border border-muted-teal rounded-lg overflow-hidden divide-y divide-muted-teal/50">
                {myIdeas.map((idea) => (
                  <Link
                    key={idea.id}
                    href={`/ideas/${idea.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-dry-sage/20 transition-colors"
                  >
                    <span className="flex-1 text-sm text-dark-slate">{idea.title}</span>
                    <span className="text-xs text-dark-slate/40 flex-shrink-0">
                      {idea._count.votes} vote{idea._count.votes !== 1 ? "s" : ""} &nbsp;·&nbsp;{" "}
                      {idea._count.comments} comment{idea._count.comments !== 1 ? "s" : ""}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab: Min aktivitet */}
      {activeTab === "activity" && (
        <div className="space-y-10">
          {/* Sammanfattning */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Sammanfattning</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-muted-teal rounded-lg p-5 flex flex-col gap-1">
                <span className="text-3xl font-bold text-seagrass">{distinctProjectCount}</span>
                <span className="text-sm text-dark-slate/60">Projekt bidragit till</span>
              </div>
              <div className="border border-muted-teal rounded-lg p-5 flex flex-col gap-1">
                <span className="text-3xl font-bold text-seagrass">{activitiesThisMonth}</span>
                <span className="text-sm text-dark-slate/60">Aktiviteter denna månad</span>
              </div>
              <div className="border border-muted-teal rounded-lg p-5 flex flex-col gap-1">
                <span className="text-3xl font-bold text-seagrass">{ideasCount}</span>
                <span className="text-sm text-dark-slate/60">Idéer inskickade</span>
              </div>
            </div>
          </section>

          {/* Senaste aktivitet */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Senaste aktivitet</h2>
            {activityEvents.length === 0 ? (
              <p className="text-dark-slate/50 italic text-sm">
                Du har ingen aktivitet ännu. Gå med i ett projekt för att komma igång.
              </p>
            ) : (
              <div className="space-y-6">
                {groupedEvents.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-dark-slate/40 mb-3">
                      {group.label}
                    </p>
                    <div className="border border-muted-teal rounded-lg overflow-hidden divide-y divide-muted-teal/50">
                      {group.events.map((event) => (
                        <Link
                          key={event.id}
                          href={`/projects/${event.project.slug}`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-dry-sage/20 transition-colors"
                        >
                          <span className="text-lg flex-shrink-0 w-7 text-center" aria-hidden="true">
                            {activityIcon(event.type)}
                          </span>
                          <span className="flex-1 text-sm text-dark-slate">
                            {activityDescription(event.type, event.project.title)}
                          </span>
                          <span className="text-xs text-dark-slate/40 flex-shrink-0">
                            {relativeTime(event.createdAt)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
