import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import { VoteButton, CommentForm } from "./IdeaInteractions";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const idea = await prisma.idea.findUnique({ where: { id }, select: { title: true } });
  if (!idea) return {};
  return { title: `${idea.title} — Ideas — GoodTribes.org` };
}

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [session, idea] = await Promise.all([
    auth(),
    prisma.idea.findUnique({
      where: { id },
      include: {
        author: { select: { name: true } },
        votes: { select: { userId: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true } } },
        },
      },
    }),
  ]);

  if (!idea) notFound();

  const hasVoted = session?.user?.id
    ? idea.votes.some((v) => v.userId === session.user!.id)
    : false;

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-dark-slate/50">
        <Link href="/ideas" className="hover:text-dark-slate transition-colors">
          Ideas
        </Link>
        <span className="mx-2">/</span>
        <span className="text-dark-slate line-clamp-1">{idea.title}</span>
      </nav>

      <div className="flex gap-6">
        {/* Vote column */}
        <div className="flex-shrink-0">
          <VoteButton
            ideaId={idea.id}
            voteCount={idea.votes.length}
            hasVoted={hasVoted}
            isLoggedIn={!!session?.user?.id}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-dark-slate mb-2 leading-snug">{idea.title}</h1>

          <div className="flex items-center gap-3 text-xs text-dark-slate/50 mb-4">
            <span>by {idea.author.name ?? "Unknown"}</span>
            <span>{timeAgo(idea.createdAt)}</span>
          </div>

          {/* SDG tags */}
          {idea.sdgGoals.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {idea.sdgGoals.map((n) => (
                <span
                  key={n}
                  className="text-xs bg-dry-sage text-dark-slate px-2 py-1 rounded"
                  title={SDG_LABELS[n]}
                >
                  SDG {n} — {SDG_LABELS[n]}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {idea.description ? (
            <div className="prose prose-sm max-w-none text-dark-slate/80 leading-relaxed mb-8">
              {idea.description.split("\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : (
            <p className="text-dark-slate/40 italic mb-8">No description provided.</p>
          )}

          {/* Convert to project */}
          {session?.user?.id && (
            <div className="mb-8 p-4 border border-dashed border-muted-teal rounded-lg">
              <p className="text-sm text-dark-slate/60 mb-2">
                Think this idea is ready to become a project?
              </p>
              <Link
                href={`/projects/new?from=${idea.id}&title=${encodeURIComponent(idea.title)}`}
                className="text-sm text-coral hover:underline font-medium"
              >
                Turn this into a project →
              </Link>
            </div>
          )}

          {/* Comments */}
          <div>
            <h2 className="text-sm font-semibold text-dark-slate mb-4">
              {idea.comments.length} comment{idea.comments.length !== 1 ? "s" : ""}
            </h2>

            <div className="flex flex-col gap-4 mb-6">
              {idea.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate flex-shrink-0 mt-0.5">
                    {(comment.author.name ?? "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-dark-slate">
                        {comment.author.name ?? "Unknown"}
                      </span>
                      <span className="text-xs text-dark-slate/40">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-dark-slate/80 leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {session?.user?.id ? (
              <CommentForm ideaId={idea.id} />
            ) : (
              <p className="text-sm text-dark-slate/50">
                <Link href="/login" className="text-coral hover:underline">
                  Log in
                </Link>{" "}
                to leave a comment.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
