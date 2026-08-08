export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { PostDreamForm, ReactionButtons } from "./DreamWallClient";
import FlagContentButton from "@/components/FlagContentButton";
import ShareButton from "@/components/ShareButton";
import { APP_URL, buildMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "DreamWallPage" });
  return buildMetadata({ locale, path: "/dream-wall", title: t("heading"), description: t("subtitle") });
}


function relativeTime(date: Date, t: Awaited<ReturnType<typeof getTranslations>>): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return t("timeJustNow");
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return t("timeMinutesAgo", { minutes });
  const hours = Math.floor(diff / 3600);
  if (hours < 24) return t("timeHoursAgo", { hours });
  const days = Math.floor(diff / 86400);
  if (days < 7) return t("timeDaysAgo", { days });
  const weeks = Math.floor(days / 7);
  return t("timeWeeksAgo", { weeks });
}

function firstName(name: string | null, t: Awaited<ReturnType<typeof getTranslations>>): string {
  if (!name) return t("anonymousLabel");
  return name.split(" ")[0];
}

export default async function DreamWallPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [session, t, dreams] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "DreamWallPage" }),
    prisma.dreamWallPost.findMany({
      where: { hiddenAt: null },
      include: {
        user: { select: { name: true, image: true } },
        reactions: { select: { emoji: true, userId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const currentUserId = session?.user?.id ?? null;

  return (
    <div className="max-w-4xl space-y-8">
      {/* Hero */}
      <div className="text-center space-y-2 py-4">
        <h1 className="text-3xl font-bold text-dark-slate tracking-tight">
          {t("heading")}
        </h1>
        <p className="text-dark-slate/50 text-base">
          {t("subtitle")}
        </p>
        <div className="flex justify-center">
          <ShareButton url={`${APP_URL}/${locale}/dream-wall`} title={t("shareTitle")} />
        </div>
      </div>

      {/* Post form — only for logged-in users */}
      {session?.user ? (
        <PostDreamForm />
      ) : (
        <div className="border border-dashed border-muted-teal/40 rounded-xl p-6 text-center text-sm text-dark-slate/50">
          <a href="/login" className="text-muted-teal font-medium hover:underline">
            {t("loginPrompt")}
          </a>{" "}
          {t("loginToShareSuffix")}
        </div>
      )}

      {/* Dream cards */}
      {dreams.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-xl p-16 text-center">
          <p className="text-dark-slate/40 text-sm">
            {t("emptyState")}
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-0">
          {dreams.map((dream) => (
            <div
              key={dream.id}
              className="break-inside-avoid mb-4 bg-white border border-muted-teal/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3"
            >
              {/* Dream text */}
              <p className="italic text-dark-slate text-base leading-relaxed">
                &ldquo;{dream.dreamText}&rdquo;
              </p>

              {/* Attribution + time */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-dark-slate/60 font-medium">
                  — {firstName(dream.user.name, t)}
                </span>
                <span className="text-xs text-dark-slate/30 shrink-0">
                  {relativeTime(dream.createdAt, t)}
                </span>
              </div>

              {/* Reaction bar */}
              <ReactionButtons
                dreamWallPostId={dream.id}
                initialReactions={dream.reactions}
                currentUserId={currentUserId}
              />
              {currentUserId && <FlagContentButton targetType="DreamWallPost" targetId={dream.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
