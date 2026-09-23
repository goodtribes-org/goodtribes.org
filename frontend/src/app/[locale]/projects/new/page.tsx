import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { htmlToPreviewText } from "@/lib/renderBody";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import NewProjectGuide from "./NewProjectGuide";
import ProjectStartChoice from "./ProjectStartChoice";
import { isFeatureEnabled } from "@/lib/featureFlags";
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
  searchParams: Promise<{ from?: string; fromThread?: string; title?: string; manual?: string }>;
}) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "NewProjectPage" }),
  ]);
  if (!session?.user?.id) redirect("/login");

  const { from: ideaId, fromThread, title: titleParam, manual } = await searchParams;

  // Vägvalet (behind the ai-project-start flag): a plain "Nytt projekt"
  // first asks how much the AI should do. Promoting an idea or a thread, or
  // choosing "Jag gör allt själv" (?manual=1), goes straight to Snabbstart.
  if (!ideaId && !fromThread && !manual && (await isFeatureEnabled("ai-project-start", session.user.id))) {
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
