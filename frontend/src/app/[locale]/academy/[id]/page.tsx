export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import CompleteGuideForm from "./CompleteGuideForm";
import { publishGuide } from "../actions";
import { isSiteAdmin } from "@/lib/authz";
import { buildMetadata, APP_URL } from "@/lib/metadata";
import ShareButton from "@/components/ShareButton";
import FlagContentButton from "@/components/FlagContentButton";
import LikeCommentBlock from "@/components/LikeCommentBlock";
import { getLikeCommentData } from "@/lib/socialInteractions";
import { getTranslations } from "next-intl/server";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const guide = await prisma.academyGuide.findUnique({
    where: { id },
    select: { title: true, bodyMarkdown: true, published: true, hiddenAt: true },
  });
  if (!guide || !guide.published || guide.hiddenAt) return {};
  return buildMetadata({
    locale,
    path: `/academy/${id}`,
    title: guide.title,
    description: guide.bodyMarkdown.slice(0, 160),
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  Projektledning: "bg-blue-100 text-blue-700",
  Crowdfunding:   "bg-amber-100 text-amber-700",
  Community:      "bg-purple-100 text-purple-700",
  Teknik:         "bg-cyan-100 text-cyan-700",
  Impact:         "bg-green-100 text-green-700",
};

export default async function AcademyGuidePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const [session, guide, t] = await Promise.all([
    auth(),
    prisma.academyGuide.findUnique({
      where: { id },
      include: {
        author: { select: { name: true } },
        _count: { select: { completions: true } },
      },
    }),
    getTranslations({ locale, namespace: "AcademyGuidePage" }),
  ]);

  const DIFFICULTY_BADGES: Record<string, { label: string; cls: string }> = {
    beginner:  { label: t("difficultyBeginner"),  cls: "bg-green-100 text-green-700" },
    avancerad: { label: t("difficultyAdvanced"),  cls: "bg-orange-100 text-orange-700" },
    advanced:  { label: t("difficultyAdvanced"),  cls: "bg-orange-100 text-orange-700" },
  };

  const isAdmin = !!session?.user?.id && (await isSiteAdmin(session.user.id));
  const isAuthor = !!session?.user?.id && guide?.authorId === session.user.id;
  const canManage = isAdmin || isAuthor;

  if (!guide || (!guide.published && !canManage) || (guide.hiddenAt && !canManage)) notFound();

  const { likeCount, liked, comments } = await getLikeCommentData("academyGuide", guide.id, session?.user?.id ?? null);

  const hasCompleted = session?.user?.id
    ? !!(await prisma.userGuideCompletion.findUnique({
        where: { userId_guideId: { userId: session.user.id, guideId: id } },
      }))
    : false;

  const catCls = CATEGORY_COLORS[guide.category] ?? "bg-gray-100 text-gray-600";
  const diff = DIFFICULTY_BADGES[guide.difficulty] ?? DIFFICULTY_BADGES.beginner;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/academy"
        className="inline-flex items-center gap-1 text-sm text-dark-slate/50 hover:text-dark-slate mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t("backToAcademy")}
      </Link>

      {/* Guide header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${catCls}`}>
            {guide.category}
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${diff.cls}`}>
            {diff.label}
          </span>
          {hasCompleted && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-seagrass/20 text-seagrass">
              {t("completedBadge")}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold text-dark-slate mb-3">{guide.title}</h1>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 text-sm text-dark-slate/50">
            <span>{t("byAuthor", { name: guide.author.name ?? t("unknownAuthor") })}</span>
            <span>{t("readTime", { minutes: guide.readTimeMinutes })}</span>
            <span>{t("completionCount", { count: guide._count.completions })}</span>
          </div>
          <div className="flex items-center gap-3">
            {guide.published && (
              <ShareButton
                url={`${APP_URL}/${locale}/academy/${id}`}
                title={guide.title}
                variant="icon"
              />
            )}
            {session?.user?.id && (
              <FlagContentButton targetType="AcademyGuide" targetId={guide.id} />
            )}
          </div>
        </div>
      </div>

      {/* Publish banner for unpublished guides */}
      {!guide.published && canManage && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800 font-medium">{t("unpublishedNotice")}</p>
          <form action={publishGuide.bind(null, id)}>
            <button
              type="submit"
              className="shrink-0 px-4 py-1.5 rounded bg-seagrass text-white text-sm font-semibold hover:bg-seagrass/80 transition-colors"
            >
              {t("publishButton")}
            </button>
          </form>
        </div>
      )}

      <hr className="border-muted-teal/30 mb-8" />

      {/* Guide body */}
      <div className="prose prose-slate max-w-none mb-10
        prose-headings:text-dark-slate prose-a:text-seagrass prose-a:no-underline hover:prose-a:underline
        prose-strong:text-dark-slate">
        <ReactMarkdown>{guide.bodyMarkdown}</ReactMarkdown>
      </div>

      {/* Complete action */}
      {session?.user?.id && (
        <div className="border-t border-muted-teal/30 pt-8">
          {hasCompleted ? (
            <div className="flex items-center gap-2 text-seagrass font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t("completedNotice")}
            </div>
          ) : (
            <CompleteGuideForm guideId={id} />
          )}
        </div>
      )}

      <div className="border-t border-muted-teal/30 pt-6 mt-8">
        <LikeCommentBlock
          targetType="academyGuide"
          targetId={guide.id}
          isLoggedIn={!!session?.user?.id}
          initialLikeCount={likeCount}
          initialLiked={liked}
          initialComments={comments}
        />
      </div>
    </div>
  );
}
