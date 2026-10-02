import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { htmlToPreviewText } from "@/lib/renderBody";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import NewProjectGuide from "./NewProjectGuide";
import ProjectStartChoice from "./ProjectStartChoice";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { parseDreamState } from "@/lib/dreamConversation";
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
  searchParams: Promise<{ from?: string; fromThread?: string; title?: string; manual?: string; ai?: string }>;
}) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "NewProjectPage" }),
  ]);
  const { from: ideaId, fromThread, title: titleParam, manual, ai } = await searchParams;
  if (!session?.user?.id) {
    // Keep "utan AI" through the login, or the visitor lands on the choice.
    const back = `/${locale}/projects/new${ai === "off" ? "?ai=off" : ""}`;
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(back)}`);
  }

  // "Starta ett projekt utan AI" (?ai=off): straight to Snabbstart, and the
  // project is created with AI switched off. Plain ?manual=1 is also the
  // fallback when AI isn't available, so it leaves the mode unset.
  const withoutAi = ai === "off";

  // Vägvalet (behind the ai-project-start flag): a plain "Nytt projekt"
  // first asks how much the AI should do. Promoting an idea or a thread, or
  // choosing to do it without AI (?ai=off), goes straight to Snabbstart.
  // Without an Anthropic key there is no vägval — straight to Snabbstart.
  if (!ideaId && !fromThread && !manual && !withoutAi && (await isAiProjectStartAvailable(session.user.id))) {
    const inProgress = await prisma.dreamConversation.findMany({
      where: { userId: session.user.id, status: "in_progress" },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: { roomId: true, updatedAt: true, state: true },
    });
    return (
      <ProjectStartChoice
        inProgress={inProgress.map((c) => ({
          roomId: c.roomId,
          updatedAt: c.updatedAt,
          coveredCount: parseDreamState(c.state).covered.length,
        }))}
      />
    );
  }

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
