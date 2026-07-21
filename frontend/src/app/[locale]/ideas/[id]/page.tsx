export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { IdeaSidebar, CommentForm } from "./IdeaInteractions";
import ScrollToHash from "@/components/ScrollToHash";
import FlagContentButton from "@/components/FlagContentButton";
import { SdgIcon } from "@/components/SdgIcon";
import { SDG_LABELS_EN } from "@/lib/sdg";
import { buildMetadata, APP_URL } from "@/lib/metadata";
import ShareButton from "@/components/ShareButton";
import IdeaMindMapSection from "./IdeaMindMapSection";
import type { Node, Edge } from "@xyflow/react";

const STATUS_STEPS = ["open", "review", "shortlisted", "approved", "converted"];

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  draft:       { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  open:        { bg: "bg-teal-50", text: "text-teal-700", label: "Open" },
  review:      { bg: "bg-amber-100", text: "text-amber-700", label: "Under Review" },
  shortlisted: { bg: "bg-purple-100", text: "text-purple-700", label: "Shortlisted" },
  approved:    { bg: "bg-green-100", text: "text-green-700", label: "Approved" },
  converted:   { bg: "bg-coral/10", text: "text-coral", label: "Converted" },
};

const REGION_LABELS: Record<string, string> = {
  local: "Local", regional: "Regional", national: "National", global: "Global",
};

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatReach(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  const idea = await prisma.idea.findUnique({ where: { id }, select: { title: true, problem: true, description: true, hiddenAt: true } });
  if (!idea || idea.hiddenAt) return {};
  const desc = idea.problem ?? idea.description ?? "An idea on GoodTribes.org";
  return buildMetadata({ locale, path: `/ideas/${id}`, title: idea.title, description: desc });
}

export default async function IdeaDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;

  const [session, idea] = await Promise.all([
    auth(),
    prisma.idea.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, image: true } },
        votes: { select: { userId: true } },
        endorsements: { select: { userId: true } },
        followers: { select: { userId: true } },
        comments: {
          where: { hiddenAt: null },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true, image: true } } },
        },
        mindMap: true,
      },
    }),
  ]);

  if (!idea) notFound();

  const userId = session?.user?.id;
  const hasVoted = userId ? idea.votes.some((v) => v.userId === userId) : false;
  const hasEndorsed = userId ? idea.endorsements.some((e) => e.userId === userId) : false;
  const hasFollowed = userId ? idea.followers.some((f) => f.userId === userId) : false;
  const isAuthor = userId === idea.author.id;

  const userRecord = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    : null;
  const isModerator = userRecord?.email?.endsWith("@goodtribes.org") ?? false;

  // A moderation-hidden idea (see ContentFlag/contentModeration.ts) stays
  // visible to its author and moderators, 404s for everyone else — same
  // as academy/[id]'s !published gate.
  if (idea.hiddenAt && !isAuthor && !isModerator) notFound();

  // Increment view count (best effort)
  prisma.idea.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const statusInfo = STATUS_COLORS[idea.status] ?? STATUS_COLORS.open;
  const currentStep = STATUS_STEPS.indexOf(idea.status);

  return (
    <div className="max-w-4xl mx-auto">
      <ScrollToHash />
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-dark-slate/50 flex items-center gap-2">
        <Link href="/ideas" className="hover:text-dark-slate transition-colors">Ideas</Link>
        <span>/</span>
        <span className="text-dark-slate truncate max-w-xs">{idea.title}</span>
      </nav>

      {/* Cover image */}
      {idea.imageUrl && (
        <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-6 bg-dry-sage">
          <Image src={idea.imageUrl} alt={idea.title} fill unoptimized className="object-cover" />
        </div>
      )}

      {/* Status progress bar */}
      {idea.status !== "draft" && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {STATUS_STEPS.map((step, i) => {
              const info = STATUS_COLORS[step];
              const done = currentStep >= i;
              const current = currentStep === i;
              return (
                <div key={step} className="flex-1 flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    done ? `${info.bg} ${info.text} ring-2 ring-offset-1 ${current ? "ring-current" : "ring-transparent"}` : "bg-gray-100 text-gray-400"
                  }`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span className={`text-[9px] mt-1 font-medium uppercase tracking-wider ${done ? info.text : "text-gray-400"}`}>
                    {info?.label ?? step}
                  </span>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`hidden md:block absolute mt-3.5 w-full h-0.5 -right-1/2 ${done && currentStep > i ? "bg-seagrass" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-seagrass rounded-full transition-all"
              style={{ width: `${Math.max(5, (currentStep / (STATUS_STEPS.length - 1)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="flex gap-8">
        {/* Sidebar — vote/endorse/follow */}
        <div className="flex-shrink-0 w-24">
          <IdeaSidebar
            ideaId={idea.id}
            voteCount={idea.votes.length}
            hasVoted={hasVoted}
            endorseCount={idea.endorsements.length}
            hasEndorsed={hasEndorsed}
            followCount={idea.followers.length}
            hasFollowed={hasFollowed}
            isLoggedIn={!!userId}
            isAuthor={isAuthor}
            isModerator={isModerator}
            currentStatus={idea.status}
            shareUrl={`${APP_URL}/${locale}/ideas/${id}`}
            shareTitle={idea.title}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
              {statusInfo.label}
            </span>
            {idea.category && (
              <span className="text-xs font-medium text-dark-slate/50 uppercase tracking-wider">{idea.category}</span>
            )}
            {idea.targetRegion && (
              <span className="text-xs px-2 py-0.5 border border-muted-teal rounded-full text-dark-slate/50">
                {REGION_LABELS[idea.targetRegion] ?? idea.targetRegion}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-dark-slate mb-3 leading-snug">{idea.title}</h1>

          <div className="flex items-center gap-3 mb-6 text-sm text-dark-slate/50">
            {idea.author.image ? (
              <img src={idea.author.image} alt={idea.author.name ?? ""} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-dry-sage flex items-center justify-center text-xs font-bold text-dark-slate">
                {(idea.author.name ?? "?")[0].toUpperCase()}
              </div>
            )}
            <span>{idea.author.name ?? "Unknown"}</span>
            <span>·</span>
            <span>{timeAgo(idea.createdAt)}</span>
            <span>·</span>
            <span>{idea.viewCount} views</span>
          </div>

          {/* Tags */}
          {idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {idea.tags.map((tag) => (
                <span key={tag} className="text-xs bg-dry-sage text-dark-slate/60 px-2.5 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          )}

          {/* Problem */}
          {(idea.problem || (!idea.solution && idea.description)) && (
            <section className="mb-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-dark-slate uppercase tracking-wider mb-3">
                <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs">!</span>
                Problem
              </h2>
              <div className="bg-red-50/50 border border-red-100 rounded-xl p-4">
                <p className="text-sm text-dark-slate/80 leading-relaxed whitespace-pre-wrap">
                  {idea.problem ?? idea.description}
                </p>
              </div>
            </section>
          )}

          {/* Solution */}
          {idea.solution && (
            <section className="mb-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-dark-slate uppercase tracking-wider mb-3">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
                Solution
              </h2>
              <div className="bg-green-50/50 border border-green-100 rounded-xl p-4">
                <p className="text-sm text-dark-slate/80 leading-relaxed whitespace-pre-wrap">{idea.solution}</p>
              </div>
            </section>
          )}

          <IdeaMindMapSection
            ideaId={idea.id}
            isAuthor={isAuthor}
            initialMindMap={
              idea.mindMap
                ? {
                    id: idea.mindMap.id,
                    nodes: idea.mindMap.nodes as unknown as Node[],
                    edges: idea.mindMap.edges as unknown as Edge[],
                  }
                : null
            }
          />

          {/* Impact */}
          {(idea.sdgGoals.length > 0 || idea.estimatedReach) && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-dark-slate uppercase tracking-wider mb-3">Impact</h2>
              <div className="flex flex-wrap gap-4 items-start">
                {idea.estimatedReach && (
                  <div className="bg-dry-sage rounded-xl px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-dark-slate">{formatReach(idea.estimatedReach)}</p>
                    <p className="text-xs text-dark-slate/50 mt-0.5">people potentially reached</p>
                  </div>
                )}
                {idea.sdgGoals.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-dark-slate/40 uppercase tracking-wider mb-2">Agenda 2030:</p>
                    <div className="flex flex-wrap gap-2">
                      {idea.sdgGoals.map((n) => (
                        <div key={n} className="flex items-center gap-1.5">
                          <SdgIcon n={n} size={32} />
                          <span className="text-xs font-medium text-dark-slate">{SDG_LABELS_EN[n]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Convert to project CTA */}
          {idea.status === "approved" && userId && (
            <div className="mb-8 p-5 border-2 border-dashed border-seagrass/40 rounded-xl bg-seagrass/5">
              <p className="text-sm font-semibold text-dark-slate mb-1">This idea has been approved!</p>
              <p className="text-sm text-dark-slate/60 mb-3">
                Ready to turn it into a real project and recruit volunteers?
              </p>
              <Link
                href={`/projects/new?from=${idea.id}&title=${encodeURIComponent(idea.title)}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-seagrass text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Create project from this idea →
              </Link>
            </div>
          )}

          {!userId && (
            <div className="mb-8 p-5 border-2 border-dashed border-muted-teal/40 rounded-xl bg-muted-teal/5">
              <p className="text-sm text-dark-slate/60 mb-3">
                Think this idea is ready to become a project? Log in to vote and contribute.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-white text-sm font-medium rounded-lg hover:bg-watermelon transition-colors"
              >
                Log in to participate →
              </Link>
            </div>
          )}

          {/* Comments */}
          <section>
            <h2 className="text-base font-semibold text-dark-slate mb-4">
              {idea.comments.length} comment{idea.comments.length !== 1 ? "s" : ""}
            </h2>

            <div className="flex flex-col gap-5 mb-6">
              {idea.comments.map((comment) => (
                <div key={comment.id} id={`comment-${comment.id}`} className="flex gap-3">
                  {comment.author.image ? (
                    <img src={comment.author.image} alt={comment.author.name ?? ""} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate flex-shrink-0">
                      {(comment.author.name ?? "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-dark-slate">{comment.author.name ?? "Unknown"}</span>
                      <span className="text-xs text-dark-slate/40">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-dark-slate/80 leading-relaxed">{comment.content}</p>
                    {userId && <FlagContentButton targetType="IdeaComment" targetId={comment.id} />}
                  </div>
                </div>
              ))}
            </div>

            {userId ? (
              <CommentForm ideaId={idea.id} />
            ) : (
              <p className="text-sm text-dark-slate/50">
                <Link href="/login" className="text-coral hover:underline">Log in</Link> to leave a comment.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
