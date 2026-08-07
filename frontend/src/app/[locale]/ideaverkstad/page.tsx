export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Idéverkstaden — GoodTribes.org",
  description: "Bolla idéer med andra och med AI, från problem till projekt.",
};

function timeAgo(date: Date, t: Awaited<ReturnType<typeof getTranslations>>): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return t("timeJustNow");
  const m = Math.floor(s / 60);
  if (m < 60) return t("timeMinutesAgo", { minutes: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("timeHoursAgo", { hours: h });
  return t("timeDaysAgo", { days: Math.floor(h / 24) });
}

export default async function IdeaverkstadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const t = await getTranslations("IdeaverkstadPage");

  const rooms = await prisma.room.findMany({
    where: { type: "IDEA_THREAD", projectId: null },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    include: {
      _count: { select: { participants: true, messages: true } },
    },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
          <p className="text-sm text-dark-slate/50 mt-1">
            {t("subtitle")}
          </p>
        </div>
        <Link
          href="/ideaverkstad/new"
          className="px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors flex-shrink-0"
        >
          {t("newSessionCta")}
        </Link>
      </div>

      <Link href="/sandbox" className="block text-sm text-amber-700 hover:underline mb-6">
        {t("sandboxPromo")}
      </Link>

      {rooms.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-lg p-16 text-center">
          <p className="text-dark-slate/40 text-sm mb-3">{t("emptyState")}</p>
          <Link href="/ideaverkstad/new" className="text-coral hover:underline text-sm">
            {t("startFirstSession")}
          </Link>
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
                  {t("statsLine", {
                    participants: room._count.participants,
                    messages: room._count.messages,
                    time: timeAgo(room.lastMessageAt, t),
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
