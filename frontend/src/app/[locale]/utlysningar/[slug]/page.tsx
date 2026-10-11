export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/metadata";
import { toProxyUrl } from "@/lib/storageUrl";
import { daysLeft } from "@/lib/challenges";
import { resolveIdeaContent } from "@/lib/contentTranslation";
import { PUBLIC_PROJECT_WHERE } from "@/lib/projectVisibility";
import { amountLabel } from "@/lib/fundingCalls/public";
import { SdgIcon } from "@/components/SdgIcon";
import IdeaCard from "@/components/ny-startsida/IdeaCard";

// Published calls only. A closed one stays readable (ideas and projects
// may point at it), but takes no new ideas.
const loadCall = cache((slug: string) =>
  prisma.fundingCall.findFirst({
    where: { slug, status: { in: ["PUBLISHED", "CLOSED"] }, publishedAt: { not: null } },
    include: { fundingSource: { select: { name: true } } },
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const call = await loadCall(slug);
  if (!call) notFound();
  return buildMetadata({ locale, path: `/utlysningar/${slug}`, title: call.title, description: call.summary?.slice(0, 160), imageUrl: call.imageUrl });
}

// Utlysningar (#344): one call — what it's for, who can apply, how much and
// what the application needs, as GoodTribes summarised it, with a link to the
// funder's own page (the source's full text is never copied here). Then the
// open idea phase: ideas for what an application could contain, shared from
// Din dröm, which anyone can drive.
export default async function FundingCallPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const call = await loadCall(slug);
  if (!call) notFound();
  const t = await getTranslations({ locale, namespace: "FundingCalls" });
  const tHome = await getTranslations({ locale, namespace: "NewHomePage" });
  const open = call.status === "PUBLISHED" && (call.rolling || (!!call.deadline && call.deadline.getTime() > Date.now()));
  const dateFmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" });
  const amount = amountLabel(call.amountMinSek, call.amountMaxSek, { upTo: t("upTo"), from: t("from") });

  const ideas = await prisma.idea.findMany({
    where: { fundingCallId: call.id, hiddenAt: null, status: { not: "draft" } },
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "desc" }],
    include: {
      author: { select: { name: true } },
      _count: { select: { votes: true, comments: true, basedProjects: { where: PUBLIC_PROJECT_WHERE } } },
      translations: locale !== routing.defaultLocale ? { where: { locale } } : false,
    },
  });
  const labels = {
    label: tHome("ideas.label"),
    byAuthor: (name: string) => tHome("ideas.byAuthor", { name }),
    unknownAuthor: tHome("ideas.unknownAuthor"),
    votes: tHome("ideas.votes"),
    comments: tHome("ideas.comments"),
    noDescription: tHome("ideas.noDescription"),
    drivenBy: (count: number) => tHome("ideas.drivenBy", { count }),
    waiting: tHome("ideas.waitingBadge"),
  };

  const fact = (label: string, value: React.ReactNode) =>
    value ? (
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{label}</dt>
        <dd className="text-sm text-dark-slate/85">{value}</dd>
      </div>
    ) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/utlysningar" className="text-sm text-dark-slate/60 hover:text-dark-slate">← {t("allCalls")}</Link>
      <div className="mt-3 overflow-hidden rounded-2xl border border-muted-teal/40 bg-white">
        <div className="relative bg-gradient-to-br from-seagrass to-[#1f6f5c] p-6 text-white sm:p-8">
          {call.imageUrl && <img src={toProxyUrl(call.imageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-white/85">{t("eyebrow", { funder: call.fundingSource.name })}</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{call.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/15 px-3 py-1">
                {call.rolling ? t("rolling") : !open ? t("closed") : `⏳ ${t("daysLeftLong", { days: daysLeft(call.deadline!) })}`}
              </span>
              {amount && <span className="rounded-full bg-white/15 px-3 py-1">💰 {amount}</span>}
              <span className="rounded-full bg-white/15 px-3 py-1">💡 {t("ideaCount", { count: ideas.length })}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0">
            {call.summary && <p className="whitespace-pre-line text-base leading-relaxed text-dark-slate/85">{call.summary}</p>}
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {fact(t("deadline"), call.rolling ? t("rolling") : call.deadline ? dateFmt.format(call.deadline) : null)}
              {fact(t("whoCanApply"), call.applicantTypes.map((a) => t(`applicant.${a}`)).join(", "))}
              {fact(t("amount"), amount)}
              {fact(t("cofunding"), call.cofunding)}
              {fact(t("projectLength"), call.projectLengthMonths ? t("months", { count: call.projectLengthMonths }) : null)}
              {fact(t("stateAid"), call.stateAidRule)}
            </dl>
            {call.requirements.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-dark-slate">{t("requirements")}</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-dark-slate/80">
                  {call.requirements.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
            )}
            {call.sdgGoals.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-1.5">
                {call.sdgGoals.map((n) => <SdgIcon key={n} n={n} size={32} />)}
              </div>
            )}
            <p className="mt-6 text-xs text-dark-slate/50">{t("summaryNote", { funder: call.fundingSource.name })}</p>
          </div>

          <aside className="flex flex-col gap-3">
            {open && (
              <Link href={`/projects/new?utlysning=${encodeURIComponent(slug)}`} className="w-full rounded-full bg-coral px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-watermelon">
                {t("shareIdea")}
              </Link>
            )}
            {call.url && (
              <a href={call.url} target="_blank" rel="noopener noreferrer" className="w-full rounded-full border border-seagrass px-5 py-2.5 text-center text-sm font-semibold text-seagrass hover:bg-seagrass/10">
                {t("readAtFunder", { funder: call.fundingSource.name })} ↗
              </a>
            )}
            <div className="rounded-xl border border-muted-teal/40 p-4 text-sm text-dark-slate/75">
              <p className="font-semibold text-dark-slate">{t("howHeading")}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs">
                <li>{t("how1")}</li>
                <li>{t("how2")}</li>
                <li>{t("how3")}</li>
                <li>{t("how4")}</li>
              </ol>
            </div>
            <p className="text-xs text-dark-slate/55">
              {t("ownership")}{" "}
              <Link href="/participant-agreement" className="font-semibold text-seagrass hover:underline">{t("agreement")}</Link>
            </p>
          </aside>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-dark-slate">{t("ideasHeading")}</h2>
        <p className="text-xs text-dark-slate/55">{t("ideasIntro")}</p>
        {ideas.length === 0 ? (
          <p className="mt-3 text-sm text-dark-slate/50">{open ? t("noIdeasYet") : t("noIdeas")}</p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ideas.map((idea) => {
              const content = resolveIdeaContent(idea, idea.translations, locale);
              return (
                <IdeaCard
                  key={idea.id}
                  labels={labels}
                  idea={{ id: idea.id, title: content.title, description: content.description, authorName: idea.author.name, votes: idea._count.votes, comments: idea._count.comments, drivenBy: idea._count.basedProjects }}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
