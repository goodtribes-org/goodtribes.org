import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { toProxyUrl } from "@/lib/storageUrl";
import { PHASE_COLORS, PROJECT_PHASE_LABEL } from "@/lib/projectPhase";
import { PULSE_WEEKS, type LastEvent, type PulseStatus, type TodoItem, type YourTribeData } from "@/lib/yourTribe";
import { INK, LINK, SUBTLE, card, wrap } from "./Sections";
import { newHomeDisplayFont } from "./fonts";
import YourTribeCollapsible from "./YourTribeCollapsible";

// "Din tribe" — the logged-in member's own view at the top of the start page:
// "Att göra" (what to take care of, ranked) and "Pulsen i dina projekt"
// (moving or standing still, most active first, a 4-week bar per project).
// Data from lib/yourTribe.ts.

const STATUS_STYLE: Record<PulseStatus, { dot: string; bg: string; fg: string }> = {
  moving: { dot: "#2F9E5B", bg: "#D8F2E7", fg: "#0F5B40" },
  slowing: { dot: "#D99A06", bg: "#FCEFC7", fg: "#6B4510" },
  still: { dot: "#9AA09C", bg: "#EFEFEC", fg: "#4A514D" },
};
const TODO_ICON: Record<TodoItem["kind"], string> = { task: "☐", joinRequest: "👋", nextStep: "➜" };

export default async function YourTribe({
  locale, name, data, initialCollapsed,
}: {
  locale: Locale; name: string | null; data: YourTribeData; initialCollapsed: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "YourTribe" });
  const tStep = await getTranslations({ locale, namespace: "ProjectPhaseChecklist" });
  const dateFmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" });
  const relFmt = new Intl.RelativeTimeFormat(locale === "sv" ? "sv" : "en", { numeric: "auto" });
  const ago = (d: Date) => {
    const days = Math.round((d.getTime() - Date.now()) / 86_400_000);
    if (days === 0) return t("today");
    return Math.abs(days) < 14 ? relFmt.format(days, "day") : relFmt.format(Math.round(days / 7), "week");
  };
  const stepLabel = (key: string) => (tStep.has(key) ? tStep(key) : key);
  const lastText = (e: LastEvent) => {
    const who = e.who ?? t("someone");
    if (e.type === "message") return t("last.message", { who });
    if (e.type === "blogPost") return t("last.blogPost", { who, title: e.title });
    const known = ["task_completed", "task_created", "task_moved", "member_joined", "todo_completed", "milestone_added", "milestone_completed"];
    const key = known.includes(e.activityType) ? e.activityType : "other";
    return t(`last.${key}`, { who, title: e.title ?? "" });
  };
  const maxWeek = Math.max(1, ...data.pulse.flatMap((p) => p.weeks));
  const moving = data.pulse.filter((p) => p.status === "moving").length;
  const calmer = data.pulse.length - moving;

  return (
    <section id="din-tribe" className={`${wrap} flex flex-col gap-5 pt-10 pb-4`}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1">
          <p className="m-0 text-sm font-bold uppercase tracking-[.12em]" style={{ color: LINK }}>{t("eyebrow")}</p>
          <h2 className={`${newHomeDisplayFont.className} m-0 font-extrabold`} style={{ fontSize: "clamp(1.8rem, 3.4vw, 40px)", lineHeight: 1.1, letterSpacing: "-0.02em", color: INK }}>
            {name ? t("greeting", { name: name.split(" ")[0] }) : t("greetingNoName")}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.newKudos > 0 && (
            <Link href="/my-goodtribes?tab=kudos" className="rounded-full bg-[#FFF4EC] px-3 py-1.5 text-sm font-semibold hover:underline" style={{ color: LINK }}>
              ♥ {t("newKudos", { count: data.newKudos })}
            </Link>
          )}
          {data.unreadNotifications > 0 && (
            <Link href="/notifications" className="rounded-full bg-[#EEF2F1] px-3 py-1.5 text-sm font-semibold hover:underline" style={{ color: INK }}>
              {t("unread", { count: data.unreadNotifications })}
            </Link>
          )}
          <Link href="/my-goodtribes" className="rounded-full border border-[#E4E4DF] bg-white px-3 py-1.5 text-sm font-semibold hover:border-[#C2410C]" style={{ color: INK }}>
            {t("myGoodTribes")}
          </Link>
        </div>
      </div>

      <YourTribeCollapsible
        initialCollapsed={initialCollapsed}
        summary={
          <>
            <strong style={{ color: INK }}>{t("summaryTodos", { count: data.todoTotal })}</strong>
            {" · "}{t("summaryMoving", { count: moving })}
            {calmer > 0 && <> · {t("summaryCalmer", { count: calmer })}</>}
          </>
        }
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
          {/* Att göra */}
          <div className={`${card} flex min-w-0 flex-col gap-3 p-5 sm:p-6`}>
            <h3 className={`${newHomeDisplayFont.className} m-0 text-lg font-bold`} style={{ color: INK }}>{t("todoTitle")}</h3>
            {data.todos.length === 0 ? (
              <p className="m-0 text-sm" style={{ color: SUBTLE }}>{t("todoEmpty")}</p>
            ) : (
              <ol className="m-0 flex list-none flex-col gap-1 p-0">
                {data.todos.map((item) => {
                  const overdue = item.kind === "task" && item.overdue;
                  return (
                    <li key={`${item.kind}-${item.id}`}>
                      <Link href={item.href} className="group flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-[#F6F6F3]">
                        <span className="w-5 shrink-0 text-center" aria-hidden="true">{overdue ? "⏰" : TODO_ICON[item.kind]}</span>
                        <span className="min-w-0">
                          <span className="block text-sm leading-snug group-hover:underline" style={{ color: INK }}>
                            {item.kind === "task" && <strong>{item.title}</strong>}
                            {item.kind === "joinRequest" && t.rich("joinRequest", { name: item.name ?? t("someone"), project: item.project, b: (c) => <strong>{c}</strong> })}
                            {item.kind === "nextStep" && <><strong>{item.project}:</strong> {stepLabel(item.step)}</>}
                          </span>
                          <span className={`block text-xs ${overdue ? "font-semibold text-[#B42318]" : ""}`} style={overdue ? undefined : { color: SUBTLE }}>
                            {item.kind === "task" && (
                              <>{item.project}{item.due && <> · {overdue ? t("overdueSince", { date: dateFmt.format(item.due) }) : t("due", { date: dateFmt.format(item.due) })}</>}</>
                            )}
                            {item.kind === "joinRequest" && t("waitingForAnswer")}
                            {item.kind === "nextStep" && (item.projectStill ? t("nextStepStill") : t("nextStep"))}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
            {data.todoTotal > data.todos.length && (
              <Link href="/my-goodtribes?tab=tasks" className="self-start text-xs font-semibold hover:underline" style={{ color: LINK }}>
                {t("moreTodos", { count: data.todoTotal - data.todos.length })}
              </Link>
            )}
          </div>

          {/* Pulsen i dina projekt */}
          <div className={`${card} flex min-w-0 flex-col gap-3 p-5 sm:p-6`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className={`${newHomeDisplayFont.className} m-0 text-lg font-bold`} style={{ color: INK }}>{t("pulseTitle")}</h3>
              <span className="text-xs" style={{ color: SUBTLE }}>{t("pulseHint", { weeks: PULSE_WEEKS })}</span>
            </div>
            {data.pulse.length === 0 ? (
              <p className="m-0 text-sm" style={{ color: SUBTLE }}>
                {t("projectsEmpty")}{" "}
                <Link href="/projects" className="font-semibold hover:underline" style={{ color: LINK }}>{t("findProject")}</Link>
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col p-0">
                {data.pulse.map((p) => {
                  const st = STATUS_STYLE[p.status];
                  return (
                    <li key={p.id} className="border-b border-dashed border-[#E4E4DF] last:border-0">
                      <Link href={`/projects/${p.slug}`} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-[#F6F6F3]">
                        {p.imageUrl ? (
                          <img src={toProxyUrl(p.imageUrl)} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: `color-mix(in oklab, ${PHASE_COLORS[p.phase]} 25%, white)` }} aria-hidden="true" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold group-hover:underline" style={{ color: INK }}>{p.title}</span>
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: st.bg, color: st.fg }}>
                              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: st.dot }} />
                              {t(`status.${p.status}`)}
                            </span>
                          </span>
                          <span className="block truncate text-xs" style={{ color: SUBTLE }}>
                            {p.last ? <>{lastText(p.last)} · {ago(p.last.at)}</> : <>{PROJECT_PHASE_LABEL[p.phase]} · {t("noActivityYet")}</>}
                          </span>
                        </span>
                        <span className="flex h-7 shrink-0 items-end gap-0.5" role="img" aria-label={t("weeklyAria", { counts: p.weeks.join(", ") })}>
                          {p.weeks.map((n, i) => (
                            <span
                              key={i}
                              className="w-2.5 rounded-sm"
                              style={{ height: `${Math.max(12, (n / maxWeek) * 100)}%`, background: n === 0 ? "#E4E4DF" : st.dot, opacity: n === 0 ? 1 : 0.45 + (0.55 * (i + 1)) / PULSE_WEEKS }}
                            />
                          ))}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </YourTribeCollapsible>
    </section>
  );
}
