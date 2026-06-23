import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import { createTask, toggleTask } from "../actions";

const prisma = new PrismaClient();

export default async function TasksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await auth();

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
        <h2 className="text-base font-semibold mb-4">New task</h2>
        <input
          name="title"
          required
          placeholder="Task title"
          className="w-full border border-muted-teal rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:border-seagrass mb-3"
        />
        <textarea
          name="description"
          rows={2}
          placeholder="Description (optional)"
          className="w-full border border-muted-teal rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:border-seagrass resize-none mb-3"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-seagrass text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-seagrass/80 transition-colors"
          >
            Add
          </button>
        </div>
      </form>

      {tasks.length === 0 && (
        <p className="text-muted-teal italic">No tasks yet.</p>
      )}

      {open.length > 0 && (
        <div className="flex flex-col gap-3 mb-8">
          {open.map((task) => (
            <TaskRow key={task.id} task={task} slug={slug} />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div>
          <p className="text-xs text-dark-slate/50 uppercase tracking-wide mb-3">Done</p>
          <div className="flex flex-col gap-3">
            {done.map((task) => (
              <TaskRow key={task.id} task={task} slug={slug} />
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
}: {
  task: { id: string; title: string; description: string | null; done: boolean };
  slug: string;
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
          aria-label={task.done ? "Mark as not done" : "Mark as done"}
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
