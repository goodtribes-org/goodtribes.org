export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/metadata";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { htmlToPreviewText } from "@/lib/renderBody";
import { toProxyUrl } from "@/lib/storageUrl";
import { resolveIdeaContent } from "@/lib/contentTranslation";
import { PUBLIC_PROJECT_WHERE } from "@/lib/projectVisibility";
import { canManageChallenges, challengeStage, daysLeft, isOpenForIdeas } from "@/lib/challenges";
import IdeaCard from "@/components/ny-startsida/IdeaCard";
import ChallengeAdminBar from "./ChallengeAdminBar";
import FeatureIdeaButton from "./FeatureIdeaButton";

// The challenge and whether this viewer may see it: a draft only for the
// organisation's leads (and site admins), like a project draft (#226).
const loadChallenge = cache(async (slug: string) => {
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    include: { organisation: { select: { id: true, name: true, slug: true, verified: true, isPublic: true } } },
  });
  if (!challenge) return null;
  const userId = (await auth())?.user?.id ?? null;
  const canManage = await canManageChallenges(challenge.organisation, userId);
  const visible = canManage || (!!challenge.publishedAt && challenge.organisation.isPublic);
  return visible ? { challenge, canManage } : null;
});

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const loaded = await loadChallenge(slug);
  if (!loaded) notFound();
  const { challenge } = loaded;
  return buildMetadata({
    locale,
    path: `/challenges/${slug}`,
    title: challenge.title,
    description: challenge.description ? htmlToPreviewText(challenge.description).slice(0, 160) : undefined,
    imageUrl: challenge.imageUrl,
  });
}

export default async function ChallengePage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const loaded = await loadChallenge(slug);
  if (!loaded) notFound();
  const { challenge, canManage } = loaded;
  const t = await getTranslations({ locale, namespace: "Challenges" });
  const tHome = await getTranslations({ locale, namespace: "NewHomePage" });

  const ideas = await prisma.idea.findMany({
    where: { challengeId: challenge.id, hiddenAt: null, status: { not: "draft" } },
    orderBy: [{ challengeFeaturedAt: { sort: "desc", nulls: "last" } }, { votes: { _count: "desc" } }, { createdAt: "desc" }],
    include: {
      author: { select: { name: true } },
      _count: { select: { votes: true, comments: true, basedProjects: { where: PUBLIC_PROJECT_WHERE } } },
      translations: locale !== routing.defaultLocale ? { where: { locale } } : false,
    },
  });
  const featured = ideas.filter((i) => i.challengeFeaturedAt);
  const stage = challengeStage(challenge, featured.length);
  const open = isOpenForIdeas(challenge);
  const steps = ["submit", "refine", "select", "drive"] as const;
  const current = stage === "open" ? 0 : stage === "selecting" ? 2 : stage === "closed" ? 3 : -1;

  const cards = ideas.map((idea) => {
    const content = resolveIdeaContent(idea, idea.translations, locale);
    return {
      featured: !!idea.challengeFeaturedAt,
      card: {
        id: idea.id,
        title: content.title,
        description: content.description,
        authorName: idea.author.name,
        votes: idea._count.votes,
        comments: idea._count.comments,
        drivenBy: idea._count.basedProjects,
      },
    };
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

  return (
    <div className="mx-auto max-w-5xl">
      {canManage && <ChallengeAdminBar slug={slug} published={!!challenge.publishedAt} />}

      <div className="overflow-hidden rounded-2xl border border-muted-teal/40 bg-white">
        <div className="relative bg-gradient-to-br from-seagrass to-[#1f6f5c] p-6 text-white sm:p-8">
          {challenge.imageUrl && (
            <img src={toProxyUrl(challenge.imageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
          )}
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-white/80">
              {t("eyebrow")}{" "}
              <Link href={`/org/${challenge.organisation.slug}`} className="underline-offset-2 hover:underline">
                {challenge.organisation.name}
              </Link>
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{challenge.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/15 px-3 py-1">
                {!challenge.publishedAt ? t("draft") : open ? `⏳ ${t("daysLeftLong", { days: daysLeft(challenge.closesAt) })}` : t("closedOn", { date: challenge.closesAt.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB") })}
              </span>
              {challenge.supportText && <span className="rounded-full bg-white/15 px-3 py-1">💰 {t("hasSupport")}</span>}
              <span className="rounded-full bg-white/15 px-3 py-1">💡 {t("ideaCount", { count: ideas.length })}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0">
            <ol className="mb-5 grid grid-cols-2 gap-1 text-center text-[11px] sm:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s} className={`rounded-md px-2 py-1.5 font-semibold ${i === current ? "bg-coral text-white" : "bg-dark-slate/5 text-dark-slate/50"}`}>
                  {i + 1}. {t(`step.${s}`)}
                </li>
              ))}
            </ol>
            {challenge.description && (
              <article
                className="prose prose-sm max-w-none text-dark-slate/80 prose-a:text-coral"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(challenge.description) }}
              />
            )}
            {challenge.supportText && (
              <div className="mt-5 rounded-xl border border-seagrass/30 bg-seagrass/5 p-4">
                <p className="text-sm font-semibold text-dark-slate">{t("supportHeading")}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-dark-slate/75">{challenge.supportText}</p>
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            {open ? (
              <Link
                href={`/projects/new?challenge=${encodeURIComponent(slug)}`}
                className="w-full rounded-full bg-coral px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-watermelon"
              >
                {t("shareIdea")}
              </Link>
            ) : challenge.publishedAt ? (
              <p className="rounded-xl bg-dark-slate/5 p-3 text-sm text-dark-slate/70">{t("closedNote")}</p>
            ) : null}
            <div className="rounded-xl border border-muted-teal/40 p-4 text-sm text-dark-slate/75">
              <p className="font-semibold text-dark-slate">{t("howHeading")}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs">
                <li>{t("how1")}</li>
                <li>{t("how2")}</li>
                <li>{t("how3", { organisation: challenge.organisation.name })}</li>
                <li>{t("how4")}</li>
              </ol>
            </div>
          </aside>
        </div>
      </div>

      {featured.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-dark-slate">{t("featuredHeading")}</h2>
          <p className="text-xs text-dark-slate/55">{t("featuredNote", { organisation: challenge.organisation.name })}</p>
          <IdeaGrid items={cards.filter((c) => c.featured)} labels={labels} slug={slug} canManage={canManage} />
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-bold text-dark-slate">{t("ideasHeading")}</h2>
        {cards.length === 0 ? (
          <p className="mt-2 text-sm text-dark-slate/50">{open ? t("noIdeasYet") : t("noIdeas")}</p>
        ) : (
          <IdeaGrid items={cards.filter((c) => !c.featured)} labels={labels} slug={slug} canManage={canManage} />
        )}
      </section>
    </div>
  );
}

function IdeaGrid({
  items,
  labels,
  slug,
  canManage,
}: {
  items: { featured: boolean; card: Parameters<typeof IdeaCard>[0]["idea"] }[];
  labels: Parameters<typeof IdeaCard>[0]["labels"];
  slug: string;
  canManage: boolean;
}) {
  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ card, featured }) => (
        <div key={card.id} className="flex flex-col gap-1">
          <IdeaCard idea={card} labels={labels} />
          {canManage && <FeatureIdeaButton slug={slug} ideaId={card.id} featured={featured} />}
        </div>
      ))}
    </div>
  );
}
