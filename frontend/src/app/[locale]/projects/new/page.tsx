import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { htmlToPreviewText } from "@/lib/renderBody";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import NewProjectGuide from "./NewProjectGuide";
import DreamGuide from "./DreamGuide";
import { isStashId, readStashedGuideInput } from "@/lib/dreamGuideStash";
import { Link } from "@/i18n/navigation";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import type { Metadata } from "next";
import type { Locale } from "next-intl";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "NewProjectPage" });
  return buildMetadata({ locale, path: "/projects/new", title: t("pageTitle") });
}

export default async function NewProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ from?: string; fromThread?: string; title?: string; manual?: string; ai?: string; guide?: string }>;
}) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "NewProjectPage" }),
  ]);
  const { from: ideaId, fromThread, title: titleParam, manual, ai, guide } = await searchParams;
  const userId = session?.user?.id;

  // Drömguiden (#214): a plain "Nytt projekt" — and the start page's dream
  // box — start here. No login until "Skapa mitt projekt". Promoting an
  // idea or a thread, and Snabbstart (?manual=1), still use the form below.
  if (!ideaId && !fromThread && !manual) {
    const [aiAvailable, inProgress, tg, stashed] = await Promise.all([
      userId ? isAiProjectStartAvailable(userId) : Promise.resolve(false),
      userId
        ? prisma.dreamConversation.findFirst({
            where: { userId, status: "in_progress" },
            orderBy: { updatedAt: "desc" },
            select: { roomId: true },
          })
        : Promise.resolve(null),
      getTranslations({ locale, namespace: "DreamGuide" }),
      // Back from logging in (?guide=<id>): the answers kept on the server.
      isStashId(guide) ? readStashedGuideInput(guide) : Promise.resolve(null),
    ]);
    return (
      <div>
        {inProgress && (
          <p className="mx-auto mt-4 max-w-2xl rounded-xl bg-seagrass/5 px-4 py-2 text-sm text-dark-slate/75">
            {tg.rich("resume", {
              link: (chunks) => (
                <Link href={`/projects/new/samtal/${inProgress.roomId}`} className="font-medium text-seagrass hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        )}
        <DreamGuide
          isLoggedIn={!!userId}
          aiAvailable={aiAvailable}
          withoutAi={ai === "off"}
          stashed={stashed}
          stashId={stashed ? guide : undefined}
        />
      </div>
    );
  }

  if (!userId) {
    const back = `/${locale}/projects/new?${new URLSearchParams(
      Object.entries({ from: ideaId, fromThread, title: titleParam, manual }).filter((e): e is [string, string] => !!e[1]),
    )}`;
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(back)}`);
  }

  // Snabbstart via "utan AI" (?ai=off): the project starts with AI off.
  const withoutAi = ai === "off";

  let initial: { title?: string; description?: string; sdgGoals?: number[]; category?: string; tags?: string[]; imageUrl?: string } = {};

  if (ideaId) {
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { title: true, description: true, problem: true, solution: true, sdgGoals: true, category: true, tags: true, imageUrl: true },
    });
    if (idea) {
      const descParts = [idea.description, idea.problem, idea.solution].filter(Boolean);
      initial = {
        title: titleParam ?? idea.title,
        description: descParts.join("\n\n") || undefined,
        sdgGoals: idea.sdgGoals,
        category: idea.category ?? undefined,
        tags: idea.tags,
        imageUrl: idea.imageUrl ?? undefined,
      };
    }
  } else if (fromThread) {
    const [room, firstMessage] = await Promise.all([
      prisma.room.findFirst({ where: { id: fromThread, type: "IDEA_THREAD" }, select: { name: true } }),
      prisma.message.findFirst({ where: { roomId: fromThread }, orderBy: { createdAt: "asc" }, select: { body: true } }),
    ]);
    if (room) {
      initial = {
        title: titleParam ?? room.name ?? undefined,
        description: firstMessage
          ? `${htmlToPreviewText(firstMessage.body)}\n\n${t("fromThreadDescriptionSuffix")}`
          : undefined,
      };
    }
  } else if (titleParam) {
    initial = { title: titleParam };
  }

  const fromIdea = !!ideaId;
  const fromThreadValid = !ideaId && !!fromThread;

  return (
    <div>
      <NewProjectGuide
        initial={initial}
        ideaId={ideaId}
        fromThread={fromThreadValid ? fromThread : undefined}
        withoutAi={withoutAi}
        contextNote={
          fromIdea
            ? t("fromIdeaNote")
            : fromThreadValid
              ? t("fromThreadNote")
              : undefined
        }
      />
    </div>
  );
}
