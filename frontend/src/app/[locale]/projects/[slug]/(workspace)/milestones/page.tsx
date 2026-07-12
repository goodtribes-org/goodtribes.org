export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { createMilestone, toggleMilestone, deleteMilestone } from "./actions";
import ScrollToHash from "@/components/ScrollToHash";
import { isLeadRole } from "@/lib/authz";
import type { Metadata } from "next";


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Milestones — GoodTribes.org` };
}

function formatDate(date: Date | null) {
  if (!date) return null;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdue(date: Date | null, status: string) {
  if (!date || status === "done") return false;
  return date < new Date();
}

export default async function MilestonesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      milestones: { orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }] },
      members: session?.user?.id ? { where: { userId: session.user.id } } : false,
    },
  });
  if (!project) notFound();

  const role = ((project.members ?? []) as { role: string }[])[0]?.role;
  const isOwnerOrAdmin = isLeadRole(role);

  const done = project.milestones.filter((m) => m.status === "done").length;
  const total = project.milestones.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <ScrollToHash />
      <div className="mb-4">
        <Link href={`/projects/${slug}`} className="text-xs text-dark-slate/40 hover:text-dark-slate">
          ← {project.title}
        </Link>
        <h1 className="text-xl font-bold text-dark-slate mt-0.5">Milestones</h1>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-dark-slate/60 mb-1.5">
            <span>{done} of {total} completed</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-seagrass transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2 mb-8">
        {project.milestones.length === 0 && (
          <p className="text-sm text-dark-slate/40 py-4 text-center">No milestones yet.</p>
        )}
        {project.milestones.map((m) => {
          const overdue = isOverdue(m.dueDate, m.status);
          return (
            <div
              key={m.id}
              id={`milestone-${m.id}`}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                m.status === "done"
                  ? "border-seagrass/30 bg-seagrass/5"
                  : overdue
                  ? "border-watermelon/30 bg-watermelon/5"
                  : "border-muted-teal/30 bg-white"
              }`}
            >
              {/* Toggle */}
              {isOwnerOrAdmin ? (
                <form action={toggleMilestone.bind(null, m.id, slug)}>
                  <button
                    type="submit"
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      m.status === "done"
                        ? "bg-seagrass border-seagrass"
                        : "border-gray-300 hover:border-seagrass"
                    }`}
                  >
                    {m.status === "done" && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </form>
              ) : (
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  m.status === "done" ? "bg-seagrass border-seagrass" : "border-gray-300"
                }`}>
                  {m.status === "done" && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-snug ${m.status === "done" ? "line-through text-dark-slate/50" : "text-dark-slate"}`}>
                  {m.title}
                </p>
                {m.description && (
                  <p className="text-xs text-dark-slate/60 mt-0.5">{m.description}</p>
                )}
                {m.dueDate && (
                  <p className={`text-xs mt-1 ${overdue ? "text-watermelon font-medium" : "text-dark-slate/40"}`}>
                    {overdue ? "Overdue — " : "Due "}
                    {formatDate(m.dueDate)}
                  </p>
                )}
              </div>

              {isOwnerOrAdmin && (
                <form action={deleteMilestone.bind(null, m.id, slug)}>
                  <button
                    type="submit"
                    className="text-xs text-dark-slate/20 hover:text-watermelon transition-colors mt-0.5"
                    aria-label="Delete milestone"
                  >
                    ✕
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {/* Add form */}
      {isOwnerOrAdmin && (
        <div className="border border-muted-teal/30 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-dark-slate mb-3">Add milestone</h2>
          <form action={createMilestone.bind(null, project.id, slug)} className="space-y-3">
            <input
              name="title"
              type="text"
              required
              placeholder="Milestone title"
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="description"
                type="text"
                placeholder="Description (optional)"
                className="border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
              <input
                name="dueDate"
                type="date"
                className="border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>
            <button
              type="submit"
              className="bg-coral text-white text-sm font-medium px-4 py-2 rounded hover:bg-watermelon transition-colors"
            >
              Add milestone
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
