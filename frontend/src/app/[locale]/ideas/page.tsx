export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import Pagination from "@/components/Pagination";
import IdeasFilters from "./IdeasFilters";
import { SdgIcon } from "@/components/SdgIcon";

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
  const sort = sortParam === "top" ? "top" : sortParam === "trending" ? "trending" : "new";
  const sdgNum = sdg ? parseInt(sdg) : undefined;

  const where = {
    hiddenAt: null,
    ...(status ? { status } : { status: { not: "draft" } }),
    ...(category ? { category } : {}),
    ...(sdgNum && !isNaN(sdgNum) ? { sdgGoals: { has: sdgNum } } : {}),
    ...(region ? { targetRegion: region } : {}),
  };

  const orderBy =
    sort === "top" ? { votes: { _count: "desc" as const } }
    : sort === "trending" ? { updatedAt: "desc" as const }
    : { createdAt: "desc" as const };

  const [session, t, tCard, total, ideas] = await Promise.all([
    auth(),
    getTranslations("IdeasPage"),
    getTranslations("ProjectCard"),
    prisma.idea.count({ where }),
    prisma.idea.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { name: true } },
        _count: { select: { votes: true, comments: true, endorsements: true, followers: true } },
      },
    }),
  ]);

  const STATUS_TABS = [
    { value: "", label: t("statusAll") },
    { value: "open", label: t("statusOpen") },
    { value: "review", label: t("statusReview") },
    { value: "shortlisted", label: t("statusShortlisted") },
    { value: "approved", label: t("statusApproved") },
  ];

  function statusBadge(status: string) {
    const map: Record<string, { label: string; cls: string }> = {
      draft:       { label: t("statusDraft"),       cls: "bg-gray-100 text-gray-500" },
      open:        { label: t("statusOpen"),        cls: "bg-teal-50 text-teal-700" },
      review:      { label: t("statusReview"),       cls: "bg-amber-100 text-amber-700" },
      shortlisted: { label: t("statusShortlisted"), cls: "bg-purple-100 text-purple-700" },
      approved:    { label: t("statusApproved"),     cls: "bg-green-100 text-green-700" },
      converted:   { label: t("statusConverted"),    cls: "bg-coral/10 text-coral" },
    };
    const s = map[status] ?? map.open;
    return <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
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
            href="/ideas/new"
            className="flex-shrink-0 px-4 py-2 bg-coral text-white text-sm font-medium rounded-lg hover:bg-watermelon transition-colors"
          >
            {t("shareIdeaCta")}
          </Link>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 border-b border-muted-teal/30 pb-0 flex-nowrap overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {STATUS_TABS.map((tab) => {
          const active = (status ?? "") === tab.value;
          const params = new URLSearchParams();
          if (tab.value) params.set("status", tab.value);
          if (sort && sort !== "new") params.set("sort", sort);
          if (category) params.set("category", category);
          if (region) params.set("region", region);
          if (sdg) params.set("sdg", sdg);
          const qs = params.toString();
          return (
            <Link
              key={tab.value}
              href={`/ideas${qs ? `?${qs}` : ""}`}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "border-seagrass text-seagrass"
                  : "border-transparent text-dark-slate/50 hover:text-dark-slate"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <IdeasFilters sort={sort} category={category} region={region} sdg={sdg} status={status} total={total} />

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-dark-slate/50 mb-4">{t("noIdeasFound")}</p>
          {session?.user?.id ? (
            <Link href="/ideas/new" className="px-5 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors">
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
                    {statusBadge(idea.status)}
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
