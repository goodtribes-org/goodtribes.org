import type { Metadata } from "next";
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Ideas — GoodTribes.org",
  description: "Community ideas for impact-driven projects",
};

const prisma = new PrismaClient();

const SDG_LABELS: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Clean Energy", 8: "Decent Work",
  9: "Industry & Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships",
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function IdeasPage() {
  const [session, ideas] = await Promise.all([
    auth(),
    prisma.idea.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true } },
        _count: { select: { votes: true, comments: true } },
      },
    }),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">
            Ideas{" "}
            <span className="text-dark-slate/40 font-normal">({ideas.length})</span>
          </h1>
          <p className="text-sm text-dark-slate/60 mt-1">
            Community ideas for impact-driven projects
          </p>
        </div>
        {session?.user?.id && (
          <Link
            href="/ideas/new"
            className="px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors"
          >
            + Share idea
          </Link>
        )}
      </div>

      {ideas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-dark-slate/50 mb-4">No ideas yet.</p>
          {session?.user?.id ? (
            <Link
              href="/ideas/new"
              className="px-5 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors"
            >
              Share the first idea
            </Link>
          ) : (
            <Link href="/login" className="text-coral hover:underline text-sm">
              Log in to share an idea
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {ideas.map((idea) => (
            <Link
              key={idea.id}
              href={`/ideas/${idea.id}`}
              className="block border border-muted-teal/40 rounded-lg p-5 hover:shadow-md hover:border-muted-teal transition-all bg-white"
            >
              <div className="flex items-start gap-4">
                {/* Vote count */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0 w-12">
                  <div className="text-xl font-bold text-seagrass">{idea._count.votes}</div>
                  <div className="text-[10px] text-dark-slate/40 uppercase tracking-wider">votes</div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-dark-slate mb-1 leading-snug">
                    {idea.title}
                  </h2>
                  {idea.description && (
                    <p className="text-sm text-dark-slate/70 leading-relaxed line-clamp-2 mb-3">
                      {idea.description}
                    </p>
                  )}

                  {/* SDG tags */}
                  {idea.sdgGoals.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {idea.sdgGoals.map((n) => (
                        <span
                          key={n}
                          className="text-xs bg-dry-sage/60 text-dark-slate px-2 py-0.5 rounded"
                          title={SDG_LABELS[n]}
                        >
                          SDG {n}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-dark-slate/50">
                    <span>by {idea.author.name ?? "Unknown"}</span>
                    <span>{timeAgo(idea.createdAt)}</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      {idea._count.comments}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
