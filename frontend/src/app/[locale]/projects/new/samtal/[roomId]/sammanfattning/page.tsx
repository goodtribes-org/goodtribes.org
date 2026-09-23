export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/featureFlags";
import type { DreamSummary } from "@/lib/dreamSummary";
import SummaryReview from "./SummaryReview";

export default async function DreamSummaryPage({ params }: { params: Promise<{ locale: Locale; roomId: string }> }) {
  const { roomId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isFeatureEnabled("ai-project-start", session.user.id))) redirect("/projects/new");

  const dream = await prisma.dreamConversation.findUnique({
    where: { roomId },
    include: { project: { select: { slug: true } } },
  });
  if (!dream || dream.userId !== session.user.id) notFound();
  if (dream.status === "confirmed" && dream.project) redirect(`/projects/${dream.project.slug}/guide`);
  if (!dream.summary || dream.status !== "summary_pending") redirect(`/projects/new/samtal/${roomId}`);

  return (
    <SummaryReview
      roomId={roomId}
      aiMode={dream.aiMode === "ASSIST" ? "ASSIST" : "AGENT"}
      summary={dream.summary as unknown as DreamSummary}
      existingProject={!!dream.projectId}
    />
  );
}
