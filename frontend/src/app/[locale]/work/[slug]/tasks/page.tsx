import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createTask, toggleTask } from "../actions";
import type { Locale } from "next-intl";


export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "WorkTasksPage" }),
  ]);

  const org = await prisma.organisation.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) notFound();

  const tasks = await prisma.workspaceTask.findMany({
    where: { organisationId: org.id },
    orderBy: { createdAt: "asc" },
  });

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div>
      <form action={createTask} className="mb-8 border border-muted-teal rounded-xl p-6 bg-white">
        <input type="hidden" name="orgId" value={org.id} />
        <input type="hidden" name="slug" value={slug} />
        <h2 className="text-base font-semibold mb-4">{t("newTaskHeading")}</h2>
        <input
          name="title"
          required
          placeholder={t("titlePlaceholder")}
          className="w-full border border-muted-teal rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:border-seagrass mb-3"
        />
        <textarea
          name="description"
          rows={2}
          placeholder={t("descriptionPlaceholder")}
          className="w-full border border-muted-teal rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:border-seagrass resize-none mb-3"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-seagrass text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-seagrass/80 transition-colors"
          >
            {t("addButton")}
          </button>
        </div>
      </form>

      {tasks.length === 0 && (
        <p className="text-muted-teal italic">{t("emptyState")}</p>
      )}

      {open.length > 0 && (
        <div className="flex flex-col gap-3 mb-8">
          {open.map((task) => (
            <TaskRow key={task.id} task={task} slug={slug} t={t} />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div>
          <p className="text-xs text-dark-slate/50 uppercase tracking-wide mb-3">{t("doneHeading")}</p>
          <div className="flex flex-col gap-3">
            {done.map((task) => (
              <TaskRow key={task.id} task={task} slug={slug} t={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  slug,
  t,
}: {
  task: { id: string; title: string; description: string | null; done: boolean };
  slug: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <div
      className={`flex items-start gap-3 border rounded-xl p-4 bg-white ${
        task.done ? "border-muted-teal opacity-60" : "border-muted-teal"
      }`}
    >
      <form action={toggleTask} className="flex-shrink-0 mt-0.5">
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="done" value={String(task.done)} />
        <input type="hidden" name="slug" value={slug} />
        <button
          type="submit"
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            task.done
              ? "bg-seagrass border-seagrass text-white"
              : "border-muted-teal hover:border-seagrass"
          }`}
          aria-label={task.done ? t("markNotDone") : t("markDone")}
        >
          {task.done && (
            <svg viewBox="0 0 12 12" className="w-3 h-3 fill-current">
              <path d="M10 3L5 8.5 2 5.5l-1 1L5 10.5l6-7-1-0.5z" />
            </svg>
          )}
        </button>
      </form>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.done ? "line-through text-dark-slate/50" : ""}`}>
          {task.title}
        </p>
        {task.description && (
          <p className={`text-sm mt-0.5 ${task.done ? "text-dark-slate/40" : "text-dark-slate/60"}`}>
            {task.description}
          </p>
        )}
      </div>
    </div>
  );
}
