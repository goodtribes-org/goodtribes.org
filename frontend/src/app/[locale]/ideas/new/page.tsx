import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { htmlToPreviewText } from "@/lib/renderBody";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import NewIdeaForm from "./NewIdeaForm";
import type { Metadata } from "next";
import type { Locale } from "next-intl";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "NewIdeaPage" });
  return buildMetadata({ locale, path: "/ideas/new", title: t("pageTitle") });
}

export default async function NewIdeaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ fromThread?: string }>;
}) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "NewIdeaPage" }),
  ]);
  if (!session?.user?.id) redirect("/login");

  const { fromThread } = await searchParams;

  // Prefill from an Idéverkstaden thread's opening message, mirroring how
  // projects/new prefills from ?from={ideaId}.
  let initial: { title?: string; problem?: string } | undefined;
  if (fromThread) {
    const [room, firstMessage] = await Promise.all([
      prisma.room.findFirst({ where: { id: fromThread, type: "IDEA_THREAD" }, select: { name: true } }),
      prisma.message.findFirst({ where: { roomId: fromThread }, orderBy: { createdAt: "asc" }, select: { body: true } }),
    ]);
    if (room) {
      initial = {
        title: room.name ?? undefined,
        problem: firstMessage ? htmlToPreviewText(firstMessage.body) : undefined,
      };
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">{t("heading")}</h1>
        <p className="text-dark-slate/60 text-sm">{t("intro")}</p>
      </div>
      <NewIdeaForm initial={initial} fromThread={fromThread} />
    </div>
  );
}
