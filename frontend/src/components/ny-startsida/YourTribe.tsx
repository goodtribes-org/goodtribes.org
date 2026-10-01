import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { toProxyUrl } from "@/lib/storageUrl";
import { PHASE_COLORS, PROJECT_PHASE_LABEL, toDisplayPhase, type ProjectPhaseValue } from "@/lib/projectPhase";
import { RECENT_DAYS, type YourTribeData } from "@/lib/yourTribe";
import { INK, LINK, MUTED, SUBTLE, card, wrap } from "./Sections";
import { newHomeDisplayFont } from "./fonts";

// "Din tribe" — the logged-in member's own view at the top of the start page:
// what's waiting for them, their projects and what the others did there
// lately, and the thanks/kudos they got. Data from lib/yourTribe.ts.

function Panel({ title, link, children }: { title: string; link?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <div className={`${card} flex min-w-0 flex-col gap-3 p-5 sm:p-6`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={`${newHomeDisplayFont.className} m-0 text-lg font-bold`} style={{ color: INK }}>{title}</h3>
        {link && (
          <Link href={link.href} className="shrink-0 text-xs font-semibold hover:underline" style={{ color: LINK }}>{link.label}</Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-sm leading-relaxed" style={{ color: SUBTLE }}>{children}</p>;
}

export default async function YourTribe({ locale, name, data }: { locale: Locale; name: string | null; data: YourTribeData }) {
  const t = await getTranslations({ locale, namespace: "YourTribe" });
  const dateFormat = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" });
  const firstName = name?.split(" ")[0];
  const waiting = data.tasks.length + data.joinRequests.length;

  return (
    <section id="din-tribe" className={`${wrap} flex flex-col gap-5 pt-10 pb-4`}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1">
          <p className="m-0 text-sm font-bold uppercase tracking-[.12em]" style={{ color: LINK }}>{t("eyebrow")}</p>
          <h2 className={`${newHomeDisplayFont.className} m-0 font-extrabold`} style={{ fontSize: "clamp(1.8rem, 3.4vw, 40px)", lineHeight: 1.1, letterSpacing: "-0.02em", color: INK }}>
            {firstName ? t("greeting", { name: firstName }) : t("greetingNoName")}
          </h2>
        </div>
        {data.unreadNotifications > 0 && (
          <Link href="/notifications" className="rounded-full bg-[#FFF4EC] px-3 py-1.5 text-sm font-semibold hover:underline" style={{ color: LINK }}>
            {t("unread", { count: data.unreadNotifications })}
          </Link>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Waiting for you */}
        <Panel title={t("waitingTitle")}>
          {waiting === 0 ? (
            <Empty>{t("waitingEmpty")}</Empty>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {data.joinRequests.map((r) => (
                <li key={r.id}>
                  <Link href={`/projects/${r.project.slug}/members`} className="group flex items-start gap-2.5">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#E8531F]" aria-hidden="true" />
                    <span className="min-w-0 text-sm leading-snug group-hover:underline" style={{ color: INK }}>
                      {t("joinRequest", { name: r.user.name ?? t("someone"), project: r.project.title })}
                    </span>
                  </Link>
                </li>
              ))}
              {data.tasks.map((task) => (
                <li key={task.id}>
                  <Link href={`/projects/${task.project.slug}/tasks?card=${task.id}`} className="group flex items-start gap-2.5">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full border-2 border-[#2F7D3A]" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold leading-snug group-hover:underline" style={{ color: INK }}>{task.title}</span>
                      <span className="block text-xs" style={{ color: SUBTLE }}>
                        {task.project.title}
                        {task.dueDate && <> · {t("due", { date: dateFormat.format(task.dueDate) })}</>}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Your projects */}
        <Panel
          title={t("projectsTitle")}
          link={data.projectCount > data.projects.length ? { href: "/workplace", label: t("allProjects", { count: data.projectCount }) } : undefined}
        >
          {data.projects.length === 0 ? (
            <Empty>
              {t("projectsEmpty")}{" "}
              <Link href="/projects" className="font-semibold hover:underline" style={{ color: LINK }}>{t("findProject")}</Link>
            </Empty>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {data.projects.map((p) => {
                const phase = toDisplayPhase(p.phase as ProjectPhaseValue);
                return (
                  <li key={p.id}>
                    <Link href={`/projects/${p.slug}`} className="group flex items-center gap-3">
                      {p.imageUrl ? (
                        <img src={toProxyUrl(p.imageUrl)} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: `color-mix(in oklab, ${PHASE_COLORS[phase]} 25%, white)` }} aria-hidden="true" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold group-hover:underline" style={{ color: INK }}>{p.title}</span>
                        <span className="block text-xs" style={{ color: SUBTLE }}>
                          {PROJECT_PHASE_LABEL[phase]}
                          {p.isLead && <> · {t("youLead")}</>}
                        </span>
                      </span>
                      {p.recentByOthers > 0 && (
                        <span className="shrink-0 rounded-full bg-[#D8F2E7] px-2 py-0.5 text-[11px] font-semibold text-[#0F5B40]" title={t("recentHint", { days: RECENT_DAYS })}>
                          {t("recent", { count: p.recentByOthers })}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Thanks and kudos */}
        <Panel title={t("kudosTitle")} link={data.kudosTotal > 0 ? { href: "/workplace?tab=kudos", label: t("allKudos", { count: data.kudosTotal }) } : undefined}>
          {data.kudos.length === 0 ? (
            <Empty>{t("kudosEmpty")}</Empty>
          ) : (
            <>
              {data.kudosRecent > 0 && (
                <p className="m-0 text-sm font-semibold" style={{ color: "#0F5B40" }}>{t("kudosRecent", { count: data.kudosRecent, days: RECENT_DAYS })}</p>
              )}
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {data.kudos.map((k) => (
                  <li key={k.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-[#E8531F]" aria-hidden="true">♥</span>
                    <span className="min-w-0">
                      <span className="block text-sm leading-snug" style={{ color: MUTED }}>{k.message}</span>
                      <span className="block text-xs" style={{ color: SUBTLE }}>
                        {k.fromUser.name ?? t("someone")} · {dateFormat.format(k.createdAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>
    </section>
  );
}
