export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { createProjectIdeaThread } from "@/app/[locale]/ideaverkstad/actions";
import type { Locale } from "next-intl";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Idéverkstad — GoodTribes.org` };
}

function timeAgo(date: Date, t: Awaited<ReturnType<typeof getTranslations>>): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return t("justNow");
  const m = Math.floor(s / 60);
  if (m < 60) return t("minutesAgo", { minutes: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("hoursAgo", { hours: h });
  return t("daysAgo", { days: Math.floor(h / 24) });
}

export default async function ProjectIdeaSessionsPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "IdeaSessionsPage" }),
  ]);

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) notFound();

  const rooms = await prisma.room.findMany({
    where: { type: "IDEA_THREAD", projectId: project.id },
    orderBy: { lastMessageAt: "desc" },
    include: { _count: { select: { participants: true, messages: true } } },
  });

  async function startIdeaSession() {
    "use server";
    if (!session?.user?.id) redirect("/login");
    const { roomId } = await createProjectIdeaThread(project!.id);
    redirect(`/ideaverkstad/${roomId}`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/projects/${slug}`} className="text-xs text-dark-slate/40 hover:text-dark-slate">
            ← {project.title}
          </Link>
          <h1 className="text-xl font-bold text-dark-slate mt-0.5">{t("heading")}</h1>
          <p className="text-sm text-dark-slate/50 mt-1">{t("intro")}</p>
        </div>
        <form action={startIdeaSession}>
          <button
            type="submit"
            className="px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors flex-shrink-0"
          >
            {t("startSessionButton")}
          </button>
        </form>
      </div>

      {rooms.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-lg p-16 text-center">
          <p className="text-dark-slate/40 text-sm">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/ideaverkstad/${room.id}`}
              className="flex items-center justify-between gap-3 border border-muted-teal/40 rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
            >
              <div className="min-w-0">
                <p className="font-medium text-dark-slate truncate">{room.name ?? t("unnamedSession")}</p>
                <p className="text-xs text-dark-slate/40 mt-0.5">
                  {t("roomMeta", {
                    participants: room._count.participants,
                    messages: room._count.messages,
                    timeAgo: timeAgo(room.lastMessageAt, t),
                  })}
                </p>
              </div>
              <svg className="w-4 h-4 text-dark-slate/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
