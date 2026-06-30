import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { JoinButton, JoinRequestsPanel } from "./JoinSection";
import InviteForm from "./invite/InviteForm";
import TeamManager from "./TeamManager";
import FlagProjectButton from "@/components/FlagProjectButton";
import KudosButton from "@/components/KudosButton";
import { SdgIcon } from "@/components/SdgIcon";
import Tooltip from "@/components/Tooltip";
import { SDG_LABELS_SV, SDG_UN_URLS } from "@/lib/sdg";

function MemberAvatar({
  name,
  image,
  href,
}: {
  name: string;
  image?: string | null;
  href?: string;
}) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const inner = (
    <div className="flex flex-col items-center gap-1">
      <div className="w-12 h-12 rounded-full bg-dry-sage flex items-center justify-center text-sm font-semibold text-dark-slate overflow-hidden relative">
        {image ? (
          <Image src={image} alt={name} fill className="object-cover" unoptimized />
        ) : (
          initials
        )}
      </div>
      <span className="text-xs text-dark-slate/60 text-center leading-tight">
        {(name ?? "?").split(" ")[0]}
      </span>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="hover:opacity-75 transition-opacity" title={name}>
        {inner}
      </Link>
    );
  }
  return inner;
}

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just nu";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} dag${days !== 1 ? "ar" : ""} sedan`;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

function MiniCalendar({ events }: { events: { startsAt: Date }[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first: 0=Mon … 6=Sun
  const startDow = (firstDay.getDay() + 6) % 7;

  const eventDays = new Set(
    events
      .filter((e) => {
        const d = e.startsAt;
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((e) => e.startsAt.getDate())
  );
  const today = now.getDate();

  const monthName = now.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  const dayLabels = ["M", "T", "O", "T", "F", "L", "S"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="text-xs select-none">
      <div className="font-semibold text-dark-slate mb-2 capitalize">{monthName}</div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {dayLabels.map((d, i) => (
          <div key={i} className="text-dark-slate/40 font-medium pb-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = day === today;
          const hasEvent = eventDays.has(day);
          return (
            <div
              key={i}
              className={`py-0.5 rounded font-medium ${
                isToday
                  ? "bg-coral text-white"
                  : hasEvent
                  ? "bg-seagrass/20 text-seagrass font-semibold"
                  : "text-dark-slate/60"
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) return {};
  return {
    title: project.title,
    description: project.description ?? undefined,
    openGraph: {
      title: `${project.title} — GoodTribes.org`,
      description: project.description ?? "A project on GoodTribes.org",
      url: `/projects/${slug}`,
      ...(project.imageUrl
        ? { images: [{ url: project.imageUrl, alt: project.title }] }
        : {}),
    },
    twitter: {
      card: project.imageUrl ? "summary_large_image" : "summary",
      title: project.title,
      description: project.description ?? "A project on GoodTribes.org",
      ...(project.imageUrl ? { images: [project.imageUrl] } : {}),
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      owner: { select: { name: true } },
      org: { select: { name: true, slug: true } },
      members: {
        include: {
          user: { select: { name: true, id: true, image: true, showProfile: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      joinRequests: {
        where: { status: "pending" },
        include: { user: { select: { id: true, name: true, image: true } } },
      },
      neededSkills: {
        include: { skill: { select: { id: true, name: true, slug: true } } },
        orderBy: { addedAt: "asc" },
      },
      _count: { select: { kanbanCards: true, todoItems: true } },
    },
  });
  if (!project) notFound();

  const userId = session?.user?.id;
  const userMembership = project.members.find((m) => m.user.id === userId);
  const isOwnerOrAdmin =
    userMembership && ["owner", "admin"].includes(userMembership.role);
  const isMember = !!userMembership;

  // Month bounds for calendar
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [latestUpdate, fundingCampaign, monthEvents, userJoinRequest, kanbanCards, todoLists, recentChannelMessages] =
    await Promise.all([
      prisma.blogPost.findFirst({
        where: { projectSlug: slug },
        orderBy: { createdAt: "desc" },
        select: { title: true, body: true, createdAt: true },
      }),
      prisma.fundingCampaign.findUnique({
        where: { projectId: project.id },
        include: {
          pledges: { select: { amount: true } },
          expenses: {
            select: { id: true, title: true, amount: true },
            orderBy: { date: "desc" },
            take: 6,
          },
        },
      }),
      prisma.calendarEvent.findMany({
        where: {
          projectSlug: slug,
          startsAt: { gte: monthStart, lte: monthEnd },
        },
        orderBy: { startsAt: "asc" },
        select: { id: true, title: true, startsAt: true },
      }),
      userId && !isMember
        ? prisma.projectJoinRequest.findFirst({
            where: { project: { slug }, userId },
            select: { status: true },
          })
        : Promise.resolve(null),
      prisma.kanbanCard.findMany({
        where: { projectSlug: slug },
        select: { column: true, title: true, priority: true },
        orderBy: [{ column: "asc" }, { order: "asc" }],
      }),
      prisma.todoList.findMany({
        where: { projectSlug: slug },
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          items: {
            select: { id: true, title: true, done: true, dueDate: true },
            orderBy: { order: "asc" },
          },
        },
      }),
      prisma.channelMessage.findMany({
        where: { channel: { projectId: project.id }, threadParentId: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { name: true, image: true } },
          channel: { select: { id: true, name: true } },
        },
      }),
    ]);

  const raised =
    fundingCampaign?.pledges.reduce((s, p) => s + p.amount, 0) ?? 0;
  const fundingPct = fundingCampaign
    ? Math.min(100, Math.round((raised / fundingCampaign.goal) * 100))
    : 0;
  const daysLeft = fundingCampaign?.deadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(fundingCampaign.deadline).getTime() - Date.now()) / 86400000
        )
      )
    : null;
  const totalTasks = kanbanCards.length;
  const doneTasks = kanbanCards.filter((c) => c.column === "DONE").length;
  const taskPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const upcomingEvents = monthEvents.filter((e) => e.startsAt >= now);
  const projectLinks: string[] = (project as typeof project & { links: string[] }).links ?? [];

  return (
    <div>
      {isOwnerOrAdmin && project.joinRequests.length > 0 && (
        <div className="mb-8">
          <JoinRequestsPanel requests={project.joinRequests} slug={slug} />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-5 items-start md:-mr-7">
        {/* Left: project story */}
        <div className="flex-1 min-w-0 space-y-8">
          {(project as typeof project & { summary: string | null }).summary && (
            <section>
              <div className="relative pl-5">
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-coral via-seagrass to-muted-teal" />
                <p className="text-[22px] leading-snug font-semibold text-dark-slate tracking-tight">
                  {(project as typeof project & { summary: string | null }).summary}
                </p>
              </div>
            </section>
          )}

          <section>
            <h2 className="text-base font-semibold text-dark-slate mb-4">Om projektet</h2>
            {project.description ? (
              project.description.trimStart().startsWith("<") ? (
                <article
                  className="prose max-w-[760px] mx-auto text-dark-slate leading-relaxed
                    prose-headings:text-dark-slate
                    prose-a:text-seagrass prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-dark-slate prose-img:rounded-xl prose-img:max-w-full"
                  dangerouslySetInnerHTML={{ __html: project.description }}
                />
              ) : (
                <article className="prose max-w-[760px] mx-auto text-dark-slate leading-relaxed
                  prose-headings:text-dark-slate
                  prose-a:text-seagrass prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-dark-slate prose-img:rounded-xl">
                  <ReactMarkdown>{project.description}</ReactMarkdown>
                </article>
              )
            ) : (
              <p className="text-dark-slate/40 italic text-sm">Ingen beskrivning ännu.</p>
            )}
          </section>

          {latestUpdate && (
            <section>
              <h2 className="text-sm font-semibold text-dark-slate mb-3">Senaste uppdatering</h2>
              <div className="border border-muted-teal/30 rounded-xl p-4">
                <p className="font-semibold text-dark-slate text-sm mb-1">{latestUpdate.title}</p>
                <p className="text-sm text-dark-slate/60 line-clamp-3">{latestUpdate.body}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-dark-slate/40">
                    {relativeTime(latestUpdate.createdAt)}
                  </span>
                  <Link
                    href={`/projects/${slug}/updates`}
                    className="text-xs text-seagrass hover:text-seagrass/80 font-medium"
                  >
                    Alla uppdateringar →
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right sidebar — 320px to align with hero right card */}
        <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-5">

          {/* Agenda 2030 widget */}
          {project.sdgGoals.length > 0 && (
            <section className="border border-muted-teal/30 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-dark-slate mb-3">Agenda 2030</h2>
              <div className="grid grid-cols-6 gap-1">
                {[...project.sdgGoals, 18].map((n) => (
                  <Tooltip key={n} lines={[`SDG ${n}`, SDG_LABELS_SV[n] ?? ""]}>
                    <a
                      href={SDG_UN_URLS[n] ?? "https://www.un.org/sustainabledevelopment/sustainable-development-goals/"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-all duration-200 ease-in-out hover:scale-[1.3] hover:shadow-md block cursor-pointer"
                    >
                      <SdgIcon n={n} size={44} />
                    </a>
                  </Tooltip>
                ))}
              </div>
            </section>
          )}

          {/* Finansiering & Uppgifter widget */}
          {(fundingCampaign || totalTasks > 0) && (
            <section className="border border-muted-teal/30 rounded-xl p-4 flex flex-col gap-4">
              {fundingCampaign && (
                <div>
                  <p className="text-xs font-medium text-dark-slate/40 mb-1.5 uppercase tracking-wide">Finansiering</p>
                  <div className="w-full h-2 bg-muted-teal/20 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-coral rounded-full transition-all" style={{ width: `${fundingPct}%` }} />
                  </div>
                  <p className="text-xs text-dark-slate/50 text-right">
                    {raised.toLocaleString("sv-SE")} av {fundingCampaign.goal.toLocaleString("sv-SE")} {fundingCampaign.currency}
                    {" · "}{fundingPct}%
                    {daysLeft !== null && ` · ${daysLeft} dagar kvar`}
                  </p>
                </div>
              )}
              {totalTasks > 0 && (
                <div>
                  <p className="text-xs font-medium text-dark-slate/40 mb-1.5 uppercase tracking-wide">Uppgifter</p>
                  <div className="w-full h-2 bg-muted-teal/20 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-seagrass rounded-full transition-all" style={{ width: `${taskPct}%` }} />
                  </div>
                  <p className="text-xs text-dark-slate/50 text-right">
                    {doneTasks} av {totalTasks} klara · {taskPct}%
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Skills needed */}
          {project.neededSkills.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-dark-slate mb-3">Söker kompetenser</h2>
              <div className="flex flex-wrap gap-2">
                {project.neededSkills.map(({ skill }) => (
                  <Link
                    key={skill.id}
                    href={`/skill/${skill.slug}`}
                    className="text-xs bg-dry-sage text-dark-slate px-3 py-1 rounded-full hover:bg-muted-teal/30 transition-colors"
                  >
                    {skill.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Links */}
          {projectLinks.length > 0 && (
            <section className="border border-muted-teal/30 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-dark-slate mb-3">Länkar</h2>
              <ul className="space-y-2">
                {projectLinks.map((url, i) => {
                  let hostname = url;
                  try {
                    hostname = new URL(url).hostname.replace(/^www\./, "");
                  } catch {}
                  return (
                    <li key={i}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-seagrass hover:underline"
                      >
                        <span className="text-dark-slate/40">🔗</span>
                        <span className="truncate">{hostname}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Kanban summary — bar chart */}
          {kanbanCards.length > 0 && (() => {
            const cols = [
              { key: "BACKLOG", label: "Backlog",  bg: "#b2b09b" },
              { key: "TODO",    label: "Att göra", bg: "#7bad93" },
              { key: "DOING",   label: "Pågår",    bg: "#ff6f59" },
              { key: "REVIEW",  label: "Granskas", bg: "#f59e0b" },
              { key: "DONE",    label: "Klart",    bg: "#43aa8b" },
            ];
            const counts = cols.map(c => kanbanCards.filter(k => k.column === c.key).length);
            const max = Math.max(...counts, 1);
            const total = kanbanCards.length;
            const done = counts[4];
            return (
              <section className="border border-muted-teal/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-dark-slate">Arbete</h2>
                  <Link href={`/projects/${slug}/kanban`} className="text-xs text-seagrass hover:underline">
                    Öppna →
                  </Link>
                </div>

                {/* Vertical bar chart */}
                <div className="flex items-end justify-between gap-1.5 mb-2">
                  {cols.map(({ key, label, bg }, i) => {
                    const count = counts[i];
                    const barH = count === 0 ? 4 : Math.max(8, Math.round((count / max) * 80));
                    return (
                      <div key={key} className="flex flex-col items-center gap-1 flex-1" title={`${label}: ${count}`}>
                        <span className="text-[10px] font-semibold text-dark-slate tabular-nums">{count}</span>
                        <div
                          className="w-full rounded-t-sm"
                          style={{ height: `${barH}px`, backgroundColor: bg }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Labels */}
                <div className="flex justify-between gap-1.5">
                  {cols.map(({ key, label }) => (
                    <div key={key} className="flex-1 text-center">
                      <span className="text-[9px] text-dark-slate/50 leading-tight block truncate">{label}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-dark-slate/40 mt-3 text-center">
                  {done} av {total} uppgifter klara
                </p>
              </section>
            );
          })()}

          {/* Todo summary */}
          {todoLists.length > 0 && (() => {
            const allItems = todoLists.flatMap(l => l.items);
            const total = allItems.length;
            const done = allItems.filter(i => i.done).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const overdue = allItems.filter(i => !i.done && i.dueDate && new Date(i.dueDate) < new Date());
            return (
              <section className="border border-muted-teal/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-dark-slate">Todos</h2>
                  <Link href={`/projects/${slug}/todos`} className="text-xs text-seagrass hover:underline">
                    Öppna →
                  </Link>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-muted-teal/20 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-seagrass rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-dark-slate/50 mb-3">{done} av {total} klara · {pct}%</p>

                {/* Lists */}
                <div className="space-y-3">
                  {todoLists.map(list => {
                    const listDone = list.items.filter(i => i.done).length;
                    const listTotal = list.items.length;
                    const undone = list.items.filter(i => !i.done).slice(0, 3);
                    return (
                      <div key={list.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-dark-slate truncate">{list.name}</span>
                          <span className="text-xs text-dark-slate/40 shrink-0 ml-2">{listDone}/{listTotal}</span>
                        </div>
                        <ul className="space-y-1">
                          {undone.map(item => (
                            <li key={item.id} className="flex items-start gap-2 text-xs text-dark-slate/60">
                              <span className="mt-0.5 w-3 h-3 shrink-0 rounded border border-muted-teal/50" />
                              <span className="leading-snug truncate">{item.title}</span>
                            </li>
                          ))}
                          {list.items.filter(i => !i.done).length > 3 && (
                            <li className="text-xs text-dark-slate/40 pl-5">
                              +{list.items.filter(i => !i.done).length - 3} till…
                            </li>
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                {overdue.length > 0 && (
                  <p className="text-xs text-coral mt-3">
                    ⚠ {overdue.length} försenad{overdue.length !== 1 ? "e" : ""}
                  </p>
                )}
              </section>
            );
          })()}

          {/* Kanaler preview */}
          {recentChannelMessages.length > 0 && (
            <section className="border border-muted-teal/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-dark-slate">Kanaler</h2>
                <Link href={`/projects/${slug}/kanaler`} className="text-xs text-seagrass hover:underline">
                  Öppna →
                </Link>
              </div>
              <ul className="space-y-3">
                {[...recentChannelMessages].reverse().map((msg) => {
                  const initials = (msg.author.name ?? "?").charAt(0).toUpperCase();
                  return (
                    <li key={msg.id} className="flex gap-2 items-start">
                      <div className="w-6 h-6 rounded-full bg-dry-sage shrink-0 flex items-center justify-center text-[10px] font-bold text-dark-slate overflow-hidden relative mt-0.5">
                        {msg.author.image ? (
                          <Image src={msg.author.image} alt={msg.author.name ?? ""} fill className="object-cover" unoptimized />
                        ) : initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-semibold text-dark-slate truncate">
                            {msg.author.name?.split(" ")[0] ?? "?"}
                          </span>
                          <span className="text-[10px] text-dark-slate/40 shrink-0">
                            #{msg.channel.name} · {relativeTime(msg.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-dark-slate/70 leading-snug line-clamp-2">
                          {msg.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Link
                href={`/projects/${slug}/kanaler`}
                className="mt-3 block text-center text-xs text-white bg-seagrass hover:bg-seagrass/90 rounded-lg py-1.5 transition-colors"
              >
                Öppna kanaler
              </Link>
            </section>
          )}

          {/* Calendar widget */}
          <section className="border border-muted-teal/30 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-dark-slate mb-3">Kalender</h2>
            <MiniCalendar events={monthEvents} />
            {upcomingEvents.length > 0 && (
              <ul className="mt-3 space-y-1.5 border-t border-muted-teal/20 pt-3">
                {upcomingEvents.slice(0, 3).map((ev) => (
                  <li key={ev.id} className="flex gap-2 items-start text-xs">
                    <span className="shrink-0 font-semibold text-coral tabular-nums w-10 text-right">
                      {ev.startsAt.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                    </span>
                    <span className="text-dark-slate/70 leading-snug">{ev.title}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/projects/${slug}/calendar`}
              className="mt-2 block text-xs text-seagrass hover:underline"
            >
              Öppna kalender →
            </Link>
          </section>

          {/* Costs */}
          {fundingCampaign && fundingCampaign.expenses.length > 0 && (
            <section className="border border-muted-teal/30 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-dark-slate mb-3">Kostnader</h2>
              <ul className="space-y-2">
                {fundingCampaign.expenses.map((exp) => (
                  <li key={exp.id} className="flex justify-between items-center text-xs">
                    <span className="text-dark-slate/70 truncate pr-2">{exp.title}</span>
                    <span className="shrink-0 font-semibold text-dark-slate tabular-nums">
                      {exp.amount.toLocaleString("sv-SE")} {fundingCampaign.currency}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/projects/${slug}/funding`}
                className="mt-3 block text-xs text-seagrass hover:underline"
              >
                Alla utgifter →
              </Link>
            </section>
          )}

          {/* Join CTA */}
          {!isMember && userId && (
            <div className="border border-seagrass/40 rounded-xl p-4 bg-seagrass/5">
              <h2 className="text-sm font-semibold text-dark-slate mb-1">Vill du bidra?</h2>
              <p className="text-xs text-dark-slate/60 mb-3">Ansök om att gå med i projektet.</p>
              <JoinButton
                projectId={project.id}
                slug={slug}
                existingStatus={userJoinRequest?.status ?? null}
              />
            </div>
          )}
          {!isMember && !userId && (
            <div className="border border-muted-teal/30 rounded-xl p-4 text-center">
              <p className="text-sm text-dark-slate/60 mb-3">
                Logga in för att gå med i projektet
              </p>
              <Link href="/auth/signin" className="text-sm text-coral font-medium hover:underline">
                Logga in →
              </Link>
            </div>
          )}

          {/* Funding widget */}
          {fundingCampaign && (
            <section className="border border-muted-teal/30 rounded-xl p-4">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-end">
                  <span className="text-xl font-bold text-dark-slate">
                    {raised.toLocaleString("sv-SE")}
                  </span>
                  <span className="text-xs text-dark-slate/50">
                    av {fundingCampaign.goal.toLocaleString("sv-SE")} {fundingCampaign.currency}
                  </span>
                </div>
                <div className="w-full h-2 bg-muted-teal/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-coral rounded-full transition-all"
                    style={{ width: `${fundingPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-dark-slate/50">
                  <span className="font-semibold text-dark-slate">{fundingPct}% finansierat</span>
                  {daysLeft !== null && <span>{daysLeft} dagar kvar</span>}
                </div>
              </div>
              <Link
                href={`/projects/${slug}/funding`}
                className="block w-full text-center px-4 py-2.5 bg-coral text-white rounded-xl font-semibold text-sm hover:bg-coral/90 transition-colors"
              >
                Stöd projektet
              </Link>
            </section>
          )}
        </div>
      </div>

      {userId && !isOwnerOrAdmin && (
        <div className="mt-10 pt-6 border-t border-muted-teal/20 flex justify-end">
          <FlagProjectButton projectId={project.id} />
        </div>
      )}
    </div>
  );
}
