import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { htmlToPreviewText } from "@/lib/renderBody";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import NewProjectGuide from "./NewProjectGuide";
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
  searchParams: Promise<{ from?: string; fromThread?: string; title?: string }>;
}) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "NewProjectPage" }),
  ]);
  if (!session?.user?.id) redirect("/login");

  const { from: ideaId, fromThread, title: titleParam } = await searchParams;

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
