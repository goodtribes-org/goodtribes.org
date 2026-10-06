export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { getTranslations, getLocale } from "next-intl/server";
import Pagination from "@/components/Pagination";
import IdeasFilters from "./IdeasFilters";
import { SdgIcon } from "@/components/SdgIcon";
import { getCachedIdeasPage } from "@/lib/listCache";
import type { Locale } from "next-intl";
import type { IdeaStatus } from "@prisma/client";

// Since #233 a listed idea is always open (no approval step, drafts aren't
// listed), so there are no status tabs. An old ?status= link is validated
// against this whitelist rather than cast, so a stale value falls back to
// "no filter" instead of Prisma throwing on an invalid enum value.
const FILTERABLE_IDEA_STATUSES: readonly IdeaStatus[] = ["open"];

export const metadata: Metadata = {
  title: "Ideas — GoodTribes.org",
  description: "Community ideas for impact-driven projects and organisations",
};

const PAGE_SIZE = 15;

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string; sort?: string; status?: string;
    category?: string; sdg?: string; region?: string;
  }>;
}) {
  const { page: pageStr, sort: sortParam, status, category, sdg, region } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const sort = sortParam === "top" ? "top" : sortParam === "trending" ? "trending" : sortParam === "waiting" ? "waiting" : "new";
  const sdgNum = sdg ? parseInt(sdg) : undefined;
  const statusFilter = FILTERABLE_IDEA_STATUSES.includes(status as IdeaStatus) ? (status as IdeaStatus) : undefined;

  const locale = (await getLocale()) as Locale;

  const [session, t, tCard, { total, ideas }] = await Promise.all([
    auth(),
    getTranslations("IdeasPage"),
    getTranslations("ProjectCard"),
    getCachedIdeasPage(sort, statusFilter, category, sdgNum, region, page, locale),
  ]);

  // #237: whether anyone drives the idea yet, instead of a status.
  function driveBadge(count: number) {
    const cls = count > 0 ? "bg-seagrass/10 text-seagrass" : "bg-amber-50 text-amber-700";
    return (
      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${cls}`}>
        {count > 0 ? t("drivenBy", { count }) : t("waitingBadge")}
      </span>
    );
  }


  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-dark-slate">{t("heading")}</h1>
          <p className="text-sm text-dark-slate/60 mt-1 max-w-lg">
            {t("subtitle")}
          </p>
        </div>
        {session?.user?.id && (
          <Link
            href="/projects/new"
            className="flex-shrink-0 px-4 py-2 bg-coral text-white text-sm font-medium rounded-lg hover:bg-watermelon transition-colors"
          >
            {t("shareIdeaCta")}
          </Link>
        )}
      </div>

      <IdeasFilters sort={sort} category={category} region={region} sdg={sdg} status={status} total={total} />

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-dark-slate/50 mb-4">{t("noIdeasFound")}</p>
          {session?.user?.id ? (
            <Link href="/projects/new" className="px-5 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors">
              {t("shareFirstIdea")}
            </Link>
          ) : (
            <Link href="/login" className="text-coral hover:underline text-sm">{t("loginToShare")}</Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            {ideas.map((idea) => (
              <Link
                key={idea.id}
                href={`/ideas/${idea.id}`}
                className="rounded-lg overflow-hidden border border-muted-teal/40 hover:shadow-md transition-shadow bg-white flex flex-col"
              >
                <div className="relative aspect-[4/3] w-full">
                  {idea.imageUrl ? (
                    <Image
                      src={idea.imageUrl}
                      alt={idea.title}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-dry-sage to-muted-teal/40 flex items-center justify-center p-4">
                      <p className="text-xs font-semibold text-dark-slate/70 text-center leading-tight line-clamp-3">{idea.title}</p>
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    {driveBadge(idea._count.basedProjects)}
                  </div>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <p className="font-bold text-dark-slate text-sm leading-tight mb-0.5">
                    {idea.title}
                  </p>
                  <p className="text-xs text-dark-slate/50 mb-2">
                    {t("byAuthor")} <span className="text-coral">{idea.author.name ?? t("unknownAuthor")}</span>
                  </p>
                  <p className="text-xs text-dark-slate/70 leading-snug mb-2 line-clamp-3 flex-1">
                    {idea.problem ?? idea.description ?? t("noDescriptionYet")}
                  </p>
                  {idea.sdgGoals.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mb-2">
                      <span className="text-[11px] font-bold text-dark-slate/40 mr-0.5">{tCard("agenda2030")}</span>
                      {idea.sdgGoals.slice(0, 7).map((n) => (
                        <SdgIcon key={n} n={n} size={20} />
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-3 divide-x divide-muted-teal/30 text-center border-t border-muted-teal/20 pt-2 mt-auto">
                    <div className="px-1">
                      <p className="text-xs font-semibold text-dark-slate">{idea._count.votes}</p>
                      <p className="text-[10px] text-dark-slate/50 leading-tight">{t("votes")}</p>
                    </div>
                    <div className="px-1">
                      <p className="text-xs font-semibold text-dark-slate">{idea._count.endorsements}</p>
                      <p className="text-[10px] text-dark-slate/50 leading-tight">{t("contributors")}</p>
                    </div>
                    <div className="px-1">
                      <p className="text-xs font-semibold text-dark-slate">{idea._count.comments}</p>
                      <p className="text-[10px] text-dark-slate/50 leading-tight">{t("comments")}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6">
            <Pagination
              page={page}
              total={total}
              perPage={PAGE_SIZE}
              searchParams={{ page: pageStr, sort: sortParam, status, category, sdg, region }}
              basePath="/ideas"
            />
          </div>
        </>
      )}
    </div>
  );
}
