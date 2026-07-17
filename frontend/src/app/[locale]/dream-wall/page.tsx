export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { PostDreamForm, ReactionButtons } from "./DreamWallClient";
import FlagContentButton from "@/components/FlagContentButton";
import ShareButton from "@/components/ShareButton";
import { APP_URL } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Drömväggen — GoodTribes.org",
  description:
    "En mening. En vision. En förändring. Dela din dröm med GoodTribes-gemenskapen.",
};


function relativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just nu";
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.floor(diff / 3600);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days} dag${days === 1 ? "" : "ar"} sedan`;
  const weeks = Math.floor(days / 7);
  return `${weeks} veck${weeks === 1 ? "a" : "or"} sedan`;
}

function firstName(name: string | null): string {
  if (!name) return "Anonym";
  return name.split(" ")[0];
}

export default async function DreamWallPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [session, dreams] = await Promise.all([
    auth(),
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
          Drömväggen 🌟
        </h1>
        <p className="text-dark-slate/50 text-base">
          En mening. En vision. En förändring.
        </p>
        <div className="flex justify-center">
          <ShareButton url={`${APP_URL}/${locale}/dream-wall`} title="Drömväggen — GoodTribes.org" />
        </div>
      </div>

      {/* Post form — only for logged-in users */}
      {session?.user ? (
        <PostDreamForm />
      ) : (
        <div className="border border-dashed border-muted-teal/40 rounded-xl p-6 text-center text-sm text-dark-slate/50">
          <a href="/login" className="text-muted-teal font-medium hover:underline">
            Logga in
          </a>{" "}
          för att dela din dröm.
        </div>
      )}

      {/* Dream cards */}
      {dreams.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-xl p-16 text-center">
          <p className="text-dark-slate/40 text-sm">
            Ingen har postat sin dröm än. Bli den första!
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
                  — {firstName(dream.user.name)}
                </span>
                <span className="text-xs text-dark-slate/30 shrink-0">
                  {relativeTime(dream.createdAt)}
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
