import { getTranslations } from "next-intl/server";
import { getMyTasks } from "@/lib/myGoodTribes";
import { Panel, Empty, Row } from "./parts";

const COLUMN_KEY: Record<string, string> = { BACKLOG: "columnBacklog", TODO: "columnTodo", DOING: "columnDoing", REVIEW: "columnReview" };

export default async function TasksTab({ userId, locale }: { userId: string; locale: string }) {
  const t = await getTranslations({ locale, namespace: "MyGoodTribes" });
  const tCol = await getTranslations({ locale, namespace: "KanbanShared" });
  const dateFmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" });
  const now = Date.now();
  const { cards, todos } = await getMyTasks(userId);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title={t("assignedTitle", { count: cards.length })}>
        {cards.length === 0 ? (
          <Empty>{t("assignedEmpty")}</Empty>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {cards.map((c) => {
              const overdue = !!c.dueDate && c.dueDate.getTime() < now;
              return (
                <Row
                  key={c.id}
                  href={`/projects/${c.project.slug}/tasks?card=${c.id}`}
                  title={c.title}
                  dot={overdue ? "#B42318" : "#2F7D3A"}
                  meta={
                    <>
                      {c.project.title} · {COLUMN_KEY[c.column] ? tCol(COLUMN_KEY[c.column]) : c.column}
                      {c.dueDate && <> · {overdue ? t("overdueSince", { date: dateFmt.format(c.dueDate) }) : t("due", { date: dateFmt.format(c.dueDate) })}</>}
                    </>
                  }
                />
              );
            })}
          </ul>
        )}
      </Panel>
      <Panel title={t("todosTitle", { count: todos.length })}>
        {todos.length === 0 ? (
          <Empty>{t("todosEmpty")}</Empty>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {todos.map((i) => (
              <Row
                key={i.id}
                href={`/projects/${i.project.slug}/calendar`}
                title={i.title}
                dot="#12486C"
                meta={<>{i.project.title}{i.dueDate && <> · {t("due", { date: dateFmt.format(i.dueDate) })}</>}</>}
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
