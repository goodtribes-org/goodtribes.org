import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { auth } from "@/auth";
import { routing } from "@/i18n/routing";
import { getMyCalendar } from "@/lib/myGoodTribes";
import { getYourTribe, type LastEvent, type PulseStatus } from "@/lib/yourTribe";
import { PHASE_COLORS, PROJECT_PHASE_LABEL } from "@/lib/projectPhase";
import { toProxyUrl } from "@/lib/storageUrl";

// Quick lists for the personal bar along the bottom of every page
// (components/PersonalBar.tsx): ?panel=counts|todo|projects|calendar. "Att
// göra" and "Mina projekt" come from lib/yourTribe.ts (the ranked to-do list
// and the projects' pulse), the calendar from lib/myGoodTribes.ts — the same
// data as Mitt GoodTribes, shortened and already worded in the viewer's language.

export type PanelPulse = { image: string | null; color: string; status: PulseStatus; statusLabel: string; weeks: number[] };
export type PanelItem = { id: string; title: string; meta?: string; href: string; icon?: string; urgent?: boolean; pulse?: PanelPulse };
const TAKE = 8;
const KNOWN_ACTIVITY = ["task_completed", "task_created", "task_moved", "member_joined", "todo_completed", "milestone_added", "milestone_completed"];

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const panel = url.searchParams.get("panel");
  const requested = url.searchParams.get("locale") ?? "";
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // Badges, refreshed on every navigation — the cheap mode, without each
  // project's latest event.
  if (panel === "counts") {
    const tribe = await getYourTribe(userId, Date.now(), { lastEvents: false });
    return NextResponse.json({ todo: tribe.todoTotal, moving: tribe.pulse.filter((p) => p.status === "moving").length });
  }

  const t = await getTranslations({ locale, namespace: "PersonalBar" });
  const tTribe = await getTranslations({ locale, namespace: "YourTribe" });
  const tStep = await getTranslations({ locale, namespace: "ProjectPhaseChecklist" });
  const fmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" });
  const now = Date.now();

  let items: PanelItem[] = [];
  if (panel === "todo") {
    const { todos } = await getYourTribe(userId, now, { lastEvents: false });
    items = todos.map((i): PanelItem => {
      if (i.kind === "task") {
        const when = i.due ? ` · ${i.overdue ? tTribe("overdueSince", { date: fmt.format(i.due) }) : tTribe("due", { date: fmt.format(i.due) })}` : "";
        return { id: `task-${i.id}`, icon: i.overdue ? "⏰" : "☐", urgent: i.overdue, title: i.title, meta: `${i.project}${when}`, href: i.href };
      }
      if (i.kind === "joinRequest") {
        return { id: `join-${i.id}`, icon: "👋", title: t("joinRequest", { name: i.name ?? tTribe("someone"), project: i.project }), meta: tTribe("waitingForAnswer"), href: i.href };
      }
      return {
        id: i.id, icon: "➜", title: t("nextStep", { project: i.project, step: tStep.has(i.step) ? tStep(i.step) : i.step }),
        meta: i.projectStill ? tTribe("nextStepStill") : tTribe("nextStep"), href: i.href,
      };
    });
  } else if (panel === "projects") {
    const relFmt = new Intl.RelativeTimeFormat(locale === "sv" ? "sv" : "en", { numeric: "auto" });
    const ago = (d: Date) => {
      const days = Math.round((d.getTime() - now) / 86_400_000);
      if (days === 0) return tTribe("today");
      return Math.abs(days) < 14 ? relFmt.format(days, "day") : relFmt.format(Math.round(days / 7), "week");
    };
    const lastText = (e: LastEvent) => {
      const who = e.who ?? tTribe("someone");
      if (e.type === "message") return tTribe("last.message", { who });
      if (e.type === "blogPost") return tTribe("last.blogPost", { who, title: e.title });
      return tTribe(`last.${KNOWN_ACTIVITY.includes(e.activityType) ? e.activityType : "other"}`, { who, title: e.title ?? "" });
    };
    const { pulse } = await getYourTribe(userId, now);
    items = pulse.map((p) => ({
      id: p.id, title: p.title, href: `/projects/${p.slug}`,
      meta: p.last ? `${lastText(p.last)} · ${ago(p.last.at)}` : `${PROJECT_PHASE_LABEL[p.phase]} · ${tTribe("noActivityYet")}`,
      pulse: { image: p.imageUrl ? toProxyUrl(p.imageUrl) : null, color: PHASE_COLORS[p.phase], status: p.status, statusLabel: tTribe(`status.${p.status}`), weeks: p.weeks },
    }));
  } else if (panel === "calendar") {
    items = (await getMyCalendar(userId, TAKE)).map((i) => ({
      id: `${i.kind}-${i.id}`, title: i.kind === "milestone" ? t("milestone", { title: i.title }) : i.title, meta: `${fmt.format(i.at)} · ${i.project.title}`, href: i.href,
    }));
  } else {
    return NextResponse.json({ error: "Unknown panel" }, { status: 400 });
  }
  return NextResponse.json({ items });
}
