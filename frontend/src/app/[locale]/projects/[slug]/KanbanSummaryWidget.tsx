import Link from "next/link";
import type { useTranslations } from "next-intl";
import { computeTaskProgress } from "@/lib/taskProgress";

export type KanbanSummaryCard = {
  column: string;
  subtasks: { id: string; title: string; done: boolean }[] | null;
};

export default function KanbanSummaryWidget({
  cards,
  slug,
  t,
}: {
  cards: KanbanSummaryCard[];
  slug: string;
  t: ReturnType<typeof useTranslations>;
}) {
  if (cards.length === 0) return null;

  const cols = [
    { key: "BACKLOG", label: t("columnBacklog"), bg: "#b2b09b" },
    { key: "TODO",    label: t("columnTodo"),    bg: "#7bad93" },
    { key: "DOING",   label: t("columnDoing"),   bg: "#ff6f59" },
    { key: "REVIEW",  label: t("columnReview"),  bg: "#f59e0b" },
    { key: "DONE",    label: t("columnDone"),    bg: "#43aa8b" },
  ];
  const { total, done } = computeTaskProgress(cards.map(c => ({ ...c, subtasks: c.subtasks ?? [] })));
  const counts = cols.map(c => {
    if (c.key === "DONE") return done;
    const cardsInCol = cards.filter(k => k.column === c.key);
    return cardsInCol.length + cardsInCol.reduce((sum, k) => sum + (k.subtasks?.length ?? 0), 0);
  });
  const max = Math.max(...counts, 1);

  return (
    <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-dark-slate">{t("tasksHeading")}</h2>
        <Link href={`/projects/${slug}/tasks`} className="text-xs text-seagrass hover:underline">
          {t("openArrowLink")}
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
        {t("tasksProgressLabel", { done, total })}
      </p>
    </section>
  );
}
