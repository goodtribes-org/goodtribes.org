import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { auth } from "@/auth";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { countMyTodos, getMyCalendar, getMyFollowing, getMyKudos, getMyRecentActivity, getMyTasks } from "@/lib/myGoodTribes";

// Quick lists for the personal bar along the bottom of every page
// (components/PersonalBar.tsx): ?panel=counts|todo|calendar|following|activity|kudos.
// The same data as the matching Mitt GoodTribes tab (lib/myGoodTribes.ts),
// shortened and already worded in the viewer's language.

export type PanelItem = { id: string; title: string; meta?: string; href: string };
const TAKE = 8;

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const panel = url.searchParams.get("panel");
  const requested = url.searchParams.get("locale") ?? "";
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "PersonalBar" });
  const tFeed = await getTranslations({ locale, namespace: "YourTribe" });
  const fmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" });

  if (panel === "counts") return NextResponse.json({ todo: await countMyTodos(userId) });

  let items: PanelItem[] = [];
  if (panel === "todo") {
    const leadIds = (
      await prisma.projectMember.findMany({ where: { userId, role: { in: ["FOUNDER", "ADMIN"] }, project: { hiddenAt: null, archivedAt: null } }, select: { projectId: true } })
    ).map((m) => m.projectId);
    const [{ cards }, requests] = await Promise.all([
      getMyTasks(userId, TAKE),
      leadIds.length
        ? prisma.projectJoinRequest.findMany({
            where: { projectId: { in: leadIds }, status: "pending" },
            select: { id: true, user: { select: { name: true } }, project: { select: { slug: true, title: true } } },
          })
        : Promise.resolve([]),
    ]);
    const now = Date.now();
    items = [
      ...requests.map((r) => ({ id: r.id, title: t("joinRequest", { name: r.user.name ?? tFeed("someone") }), meta: r.project.title, href: `/projects/${r.project.slug}/members` })),
      ...cards.map((c) => ({
        id: c.id, title: c.title, href: `/projects/${c.project.slug}/tasks?card=${c.id}`,
        meta: `${c.project.title}${c.dueDate ? ` · ${c.dueDate.getTime() < now ? tFeed("overdueSince", { date: fmt.format(c.dueDate) }) : tFeed("due", { date: fmt.format(c.dueDate) })}` : ""}`,
      })),
    ].slice(0, TAKE);
  } else if (panel === "calendar") {
    items = (await getMyCalendar(userId, TAKE)).map((i) => ({
      id: `${i.kind}-${i.id}`, title: i.kind === "milestone" ? t("milestone", { title: i.title }) : i.title, meta: `${fmt.format(i.at)} · ${i.project.title}`, href: i.href,
    }));
  } else if (panel === "following") {
    const { projects, ideas, liked } = await getMyFollowing(userId);
    items = [
      ...projects.map((p) => ({ id: `p-${p.id}`, title: p.title, meta: t("followedProject"), href: `/projects/${p.slug}` })),
      ...ideas.map((i) => ({ id: `i-${i.id}`, title: i.title, meta: t("followedIdea"), href: `/ideas/${i.id}` })),
      ...liked.map((p) => ({ id: `l-${p.id}`, title: p.title, meta: t("likedProject"), href: `/projects/${p.slug}` })),
    ].slice(0, TAKE);
  } else if (panel === "activity") {
    const known = ["task_completed", "task_created", "task_moved", "member_joined", "todo_completed", "milestone_added", "milestone_completed"];
    items = (await getMyRecentActivity(userId, TAKE)).map((e) => ({
      id: e.id,
      title: t(`activity.${known.includes(e.type) ? e.type : "other"}`, { title: (e.payload as { title?: string } | null)?.title ?? "" }),
      meta: `${e.project?.title ?? ""} · ${fmt.format(e.createdAt)}`,
      href: e.project ? `/projects/${e.project.slug}` : "/my-goodtribes?tab=activity",
    }));
  } else if (panel === "kudos") {
    items = (await getMyKudos(userId, TAKE)).map((k) => ({
      id: k.id, title: k.message, meta: `${k.fromUser.name ?? tFeed("someone")} · ${fmt.format(k.createdAt)}`, href: "/my-goodtribes?tab=kudos",
    }));
  } else {
    return NextResponse.json({ error: "Unknown panel" }, { status: 400 });
  }
  return NextResponse.json({ items });
}
