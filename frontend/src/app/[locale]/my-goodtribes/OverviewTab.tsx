import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { toProxyUrl } from "@/lib/storageUrl";
import { getYourTribe } from "@/lib/yourTribe";
import { getProjectJourney } from "@/lib/projectJourney";
import { PHASE_COLORS, PROJECT_PHASE_LABEL } from "@/lib/projectPhase";
import { Panel, Empty, Row } from "./parts";

// Översikt: each of your projects with where it is on its journey (the six
// phase bars) and its next step — the idea borrowed from IdeaBuddy — next to
// what's waiting for you and your ideas.
const MAX_PROJECTS = 8;

export default async function OverviewTab({ userId, locale }: { userId: string; locale: string }) {
  const t = await getTranslations({ locale, namespace: "MyGoodTribes" });
  const tTribe = await getTranslations({ locale, namespace: "YourTribe" });
  const tStep = await getTranslations({ locale, namespace: "ProjectPhaseChecklist" });
  const dateFmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" });

  const [tribe, ideas] = await Promise.all([
    getYourTribe(userId),
    prisma.idea.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, _count: { select: { votes: true, comments: true } } },
    }),
  ]);
  const projects = await Promise.all(
    tribe.pulse.slice(0, MAX_PROJECTS).map(async (p) => ({ ...p, journey: await getProjectJourney({ id: p.id, slug: p.slug, phase: p.phase }) })),
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <Panel title={t("projectsTitle")}>
        {projects.length === 0 ? (
          <Empty>
            {tTribe("projectsEmpty")}{" "}
            <Link href="/projects" className="font-semibold text-[#C2410C] hover:underline">{tTribe("findProject")}</Link>
          </Empty>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {projects.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 border-b border-dashed border-[#E4E4DF] pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  {p.imageUrl ? (
                    <img src={toProxyUrl(p.imageUrl)} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="h-10 w-10 shrink-0 rounded-lg" style={{ background: `color-mix(in oklab, ${PHASE_COLORS[p.phase]} 25%, white)` }} aria-hidden="true" />
                  )}
                  <Link href={`/projects/${p.slug}`} className="min-w-0 flex-1 hover:underline">
                    <span className="block truncate font-semibold text-dark-slate">{p.title}</span>
                    <span className="block text-xs text-dark-slate/60">
                      {PROJECT_PHASE_LABEL[p.phase]} · {tTribe(`status.${p.status}`)}{p.isLead && <> · {t("youLead")}</>}
                    </span>
                  </Link>
                </div>
                <div className="grid grid-cols-6 gap-1" role="img" aria-label={t("journeyAria", { done: p.journey.progress.filter((x) => x.complete).length })}>
                  {p.journey.progress.map((ph) => (
                    <span key={ph.phase} className="h-1.5 overflow-hidden rounded-full bg-[#ECECE8]" title={`${PROJECT_PHASE_LABEL[ph.phase]}: ${ph.done}/${ph.total}`}>
                      <span className="block h-full" style={{ width: `${ph.pct}%`, background: PHASE_COLORS[ph.phase], opacity: ph.phase === p.phase ? 1 : 0.55 }} />
                    </span>
                  ))}
                </div>
                {p.journey.nextStepKey && p.journey.nextStepHref && (
                  <Link href={p.journey.nextStepHref} className="self-start text-[13px] text-dark-slate/80 hover:underline">
                    <span className="font-semibold text-[#C2410C]">{t("nextStep")}</span>{" "}
                    {tStep.has(p.journey.nextStepKey) ? tStep(p.journey.nextStepKey) : p.journey.nextStepKey} →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="flex flex-col gap-5">
        <Panel title={tTribe("todoTitle")} link={tribe.todoTotal > 0 ? { href: "/my-goodtribes?tab=tasks", label: t("allTasks") } : undefined}>
          {tribe.todos.length === 0 ? (
            <Empty>{tTribe("todoEmpty")}</Empty>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {tribe.todos.map((item) => (
                <Row
                  key={`${item.kind}-${item.id}`}
                  href={item.href}
                  dot={item.kind === "joinRequest" ? "#E8531F" : item.kind === "nextStep" ? "#12486C" : "#2F7D3A"}
                  title={
                    item.kind === "task" ? item.title
                    : item.kind === "joinRequest" ? t("joinRequest", { name: item.name ?? tTribe("someone") })
                    : `${item.project}: ${tStep.has(item.step) ? tStep(item.step) : item.step}`
                  }
                  meta={
                    item.kind === "task" ? `${item.project}${item.due ? ` · ${item.overdue ? tTribe("overdueSince", { date: dateFmt.format(item.due) }) : tTribe("due", { date: dateFmt.format(item.due) })}` : ""}`
                    : item.kind === "joinRequest" ? item.project
                    : tTribe("nextStep")
                  }
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t("ideasTitle")} link={{ href: "/ideas/new", label: t("shareIdea") }}>
          {ideas.length === 0 ? (
            <Empty>{t("ideasEmpty")}</Empty>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {ideas.map((i) => (
                <Row key={i.id} href={`/ideas/${i.id}`} title={i.title} meta={t("ideaMeta", { votes: i._count.votes, comments: i._count.comments })} dot="#E8531F" />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
