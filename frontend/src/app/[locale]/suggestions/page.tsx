import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { buildMetadata } from "@/lib/metadata";
import SuggestionForm from "./SuggestionForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SuggestionsPage" });
  return buildMetadata({
    locale,
    path: "/suggestions",
    title: t("pageTitle"),
    description: t("metaDescription"),
  });
}

function timeAgo(date: Date, t: Awaited<ReturnType<typeof getTranslations>>): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return t("timeJustNow");
  const m = Math.floor(s / 60);
  if (m < 60) return t("timeMinutesAgo", { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("timeHoursAgo", { h });
  return t("timeDaysAgo", { d: Math.floor(h / 24) });
}

export default async function SuggestionsPage() {
  const t = await getTranslations("SuggestionsPage");
  const session = await auth();
  const userId = session?.user?.id;

  const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
    pending:   { label: t("statusPending"),   bg: "bg-amber-50",   text: "text-amber-700" },
    reviewed:  { label: t("statusReviewed"),  bg: "bg-green-100",  text: "text-green-700" },
    dismissed: { label: t("statusDismissed"), bg: "bg-gray-100",   text: "text-gray-500" },
  };

  const mySuggestions = userId
    ? await prisma.suggestion.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-slate">{t("pageTitle")}</h1>
        <p className="text-sm text-dark-slate/50 mt-1">
          {t("pageDescription")}
        </p>
      </div>

      {userId ? (
        <SuggestionForm />
      ) : (
        <div className="rounded-xl border border-muted-teal/40 bg-white p-4 text-center">
          <p className="text-sm text-dark-slate/60">
            <Link href="/login" className="text-coral hover:underline">{t("loginLinkText")}</Link> {t("loginPromptText")}
          </p>
        </div>
      )}

      {mySuggestions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-dark-slate uppercase tracking-wider mb-3">{t("mySuggestionsHeading")}</h2>
          <div className="flex flex-col gap-3">
            {mySuggestions.map((s) => {
              const status = STATUS_LABELS[s.status] ?? STATUS_LABELS.pending;
              return (
                <div key={s.id} className="rounded-xl border border-muted-teal/20 bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                    <span className="text-xs text-dark-slate/40">{timeAgo(s.createdAt, t)}</span>
                  </div>
                  <p className="text-sm text-dark-slate/80 leading-relaxed whitespace-pre-wrap">{s.body}</p>
                  {s.decisionNote && s.status !== "dismissed" && (
                    <p className="text-xs text-dark-slate/50 mt-2 italic">{t("decisionNoteLabel", { note: s.decisionNote })}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
