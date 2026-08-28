import Link from "next/link";
import type { useTranslations } from "next-intl";

export type TaskWithSubtasksCard = {
  id: string;
  title: string;
  column: string;
  subtasks: { id: string; title: string; done: boolean }[] | null;
};

const COLUMN_ORDER = ["TODO", "DOING", "REVIEW"];

export default function TasksWithSubtasksWidget({
  cards,
  slug,
  t,
}: {
  cards: TaskWithSubtasksCard[];
  slug: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const cardsWithSubtasks = [...cards]
    .filter(c => COLUMN_ORDER.includes(c.column) && c.subtasks && c.subtasks.length > 0)
    .sort((a, b) => COLUMN_ORDER.indexOf(a.column) - COLUMN_ORDER.indexOf(b.column));
  if (cardsWithSubtasks.length === 0) return null;

  return (
    <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-dark-slate">{t("tasksListHeading")}</h2>
        <Link href={`/projects/${slug}/tasks`} className="text-xs text-seagrass hover:underline">
          {t("openArrowLink")}
        </Link>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-3">
        {cardsWithSubtasks.map(card => {
          const doneCount = card.subtasks!.filter(s => s.done).length;
          const totalCount = card.subtasks!.length;
          return (
            <div key={card.id}>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-semibold text-dark-slate truncate">{card.title}</span>
                <span className="text-[10px] text-dark-slate/40 shrink-0">{doneCount}/{totalCount}</span>
              </div>
              <ul className="space-y-0.5">
                {card.subtasks!.map(s => (
                  <li key={s.id} className="flex items-start gap-1.5">
                    <span className="text-[10px] shrink-0 mt-px" style={{ color: s.done ? "#43aa8b" : "#b2b09b" }}>
                      {s.done ? "✓" : "○"}
                    </span>
                    <span className={`text-[10px] leading-snug ${s.done ? "line-through text-dark-slate/30" : "text-dark-slate/60"}`}>
                      {s.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
