import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import type { Metadata } from "next";
import AIReviewActions from "./AIReviewActions";

const prisma = new PrismaClient();

const AGENT_LABELS: Record<string, string> = {
  writer: "Skribent",
  analyst: "Analytiker",
  researcher: "Researcher",
};

const AGENT_ICONS: Record<string, string> = {
  writer: "✍️",
  analyst: "📊",
  researcher: "🔍",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — AI Granskning — GoodTribes.org` };
}

export default async function AiReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { title: true },
  });
  if (!project) notFound();

  const runs = await prisma.aiTaskRun.findMany({
    where: {
      status: "awaiting_review",
      kanbanCard: { projectSlug: slug },
    },
    include: {
      kanbanCard: {
        select: {
          title: true,
          description: true,
          estimate: { select: { aiHours: true } },
        },
      },
      _count: { select: { reviews: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link
          href={`/projects/${slug}`}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          &larr; {project.title}
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold text-dark-slate">AI Granskning</h1>
          {runs.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-coral text-white text-xs font-bold">
              {runs.length}
            </span>
          )}
        </div>
      </div>

      {runs.length === 0 ? (
        <p className="text-dark-slate/50 text-sm">Inga AI-leveranser väntar på granskning.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {runs.map((run) => (
            <div
              key={run.id}
              className="border border-muted-teal/30 rounded-lg overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-3 px-5 py-4 bg-dry-sage/20 border-b border-muted-teal/20">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded bg-muted-teal/30 text-dark-slate shrink-0"
                    title={`Agent: ${run.agentType}`}
                  >
                    <span>{AGENT_ICONS[run.agentType] ?? "🤖"}</span>
                    {AGENT_LABELS[run.agentType] ?? run.agentType}
                  </span>
                  {run.attemptNumber > 1 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                      Försök {run.attemptNumber}
                    </span>
                  )}
                  <h2 className="text-sm font-semibold text-dark-slate truncate">
                    {run.kanbanCard.title}
                  </h2>
                </div>
                {run.completedAt && (
                  <span className="text-xs text-dark-slate/40 shrink-0">
                    {new Date(run.completedAt).toLocaleDateString("sv-SE", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>

              {/* AI output */}
              <div className="px-5 py-4">
                {run.outputMarkdown ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-dark-slate/80 leading-relaxed">
                    {run.outputMarkdown}
                  </pre>
                ) : (
                  <p className="text-sm text-dark-slate/40 italic">Inget innehåll genererat.</p>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 py-4 border-t border-muted-teal/20 bg-dry-sage/10">
                <AIReviewActions aiTaskRunId={run.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
