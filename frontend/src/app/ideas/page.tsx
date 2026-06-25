export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import Pagination from "@/components/Pagination";
import IdeasFilters from "./IdeasFilters";

export const metadata: Metadata = {
  title: "Ideas — GoodTribes.org",
  description: "Community ideas for impact-driven projects and organisations",
};

const prisma = new PrismaClient();
const PAGE_SIZE = 15;

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "review", label: "Under Review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "approved", label: "Approved" },
];

const SDG_LABELS: Record<number, string> = {
  1:"No Poverty",2:"Zero Hunger",3:"Good Health",4:"Quality Education",
  5:"Gender Equality",6:"Clean Water",7:"Clean Energy",8:"Decent Work",
  9:"Industry & Innovation",10:"Reduced Inequalities",11:"Sustainable Cities",
  12:"Responsible Consumption",13:"Climate Action",14:"Life Below Water",
  15:"Life on Land",16:"Peace & Justice",17:"Partnerships",
};

const SDG_COLORS: Record<number, string> = {
  1:"#E5243B",2:"#DDA63A",3:"#4C9F38",4:"#C5192D",5:"#FF3A21",
  6:"#26BDE2",7:"#FCC30B",8:"#A21942",9:"#FD6925",10:"#DD1367",
  11:"#FD9D24",12:"#BF8B2E",13:"#3F7E44",14:"#0A97D9",15:"#56C02B",
  16:"#00689D",17:"#19486A",
};

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    draft:       { label: "Draft",        cls: "bg-gray-100 text-gray-500" },
    open:        { label: "Open",         cls: "bg-teal-50 text-teal-700" },
    review:      { label: "Under Review", cls: "bg-amber-100 text-amber-700" },
    shortlisted: { label: "Shortlisted",  cls: "bg-purple-100 text-purple-700" },
    approved:    { label: "Approved",     cls: "bg-green-100 text-green-700" },
    converted:   { label: "Converted",    cls: "bg-coral/10 text-coral" },
  };
  const s = map[status] ?? map.open;
  return <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const REGION_LABELS: Record<string, string> = {
  local: "Local", regional: "Regional", national: "National", global: "Global",
};

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
    ...(status ? { status } : { status: { not: "draft" } }),
    ...(category ? { category } : {}),
    ...(sdgNum && !isNaN(sdgNum) ? { sdgGoals: { has: sdgNum } } : {}),
    ...(region ? { targetRegion: region } : {}),
  };

  const orderBy =
    sort === "top" ? { votes: { _count: "desc" as const } }
    : sort === "trending" ? { updatedAt: "desc" as const }
    : { createdAt: "desc" as const };

  const [session, total, ideas] = await Promise.all([
    auth(),
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-dark-slate">Ideas</h1>
          <p className="text-sm text-dark-slate/60 mt-1 max-w-lg">
            Community ideas for impact-driven projects and organisations. Vote for what excites you, endorse ideas you'd work on, and help turn the best ones into reality.
          </p>
        </div>
        {session?.user?.id && (
          <Link
            href="/ideas/new"
            className="flex-shrink-0 px-4 py-2 bg-coral text-white text-sm font-medium rounded-lg hover:bg-watermelon transition-colors"
          >
            + Share idea
          </Link>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 border-b border-muted-teal/30 pb-0">
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
          <p className="text-dark-slate/50 mb-4">No ideas found.</p>
          {session?.user?.id ? (
            <Link href="/ideas/new" className="px-5 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors">
              Share the first idea
            </Link>
          ) : (
            <Link href="/login" className="text-coral hover:underline text-sm">Log in to share an idea</Link>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {ideas.map((idea) => (
              <Link
                key={idea.id}
                href={`/ideas/${idea.id}`}
                className="flex gap-4 border border-muted-teal/40 rounded-xl p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white group"
              >
                {/* Cover image */}
                {idea.imageUrl && (
                  <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-dry-sage">
                    <Image src={idea.imageUrl} alt={idea.title} fill unoptimized className="object-cover" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {/* Top row */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {statusBadge(idea.status)}
                    {idea.category && (
                      <span className="text-[10px] font-medium text-dark-slate/50 uppercase tracking-wider">{idea.category}</span>
                    )}
                    {idea.targetRegion && idea.targetRegion !== "global" && (
                      <span className="text-[10px] text-dark-slate/40">{REGION_LABELS[idea.targetRegion]}</span>
                    )}
                    {idea.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] bg-dry-sage text-dark-slate/60 px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>

                  <h2 className="text-base font-semibold text-dark-slate leading-snug mb-1 group-hover:text-seagrass transition-colors">
                    {idea.title}
                  </h2>

                  {(idea.problem || idea.description) && (
                    <p className="text-sm text-dark-slate/60 line-clamp-2 mb-2 leading-relaxed">
                      {idea.problem ?? idea.description}
                    </p>
                  )}

                  {/* SDG pills */}
                  {idea.sdgGoals.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {idea.sdgGoals.slice(0, 5).map((n) => (
                        <span
                          key={n}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: SDG_COLORS[n] }}
                          title={`SDG ${n} — ${SDG_LABELS[n]}`}
                        >
                          SDG {n}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats footer */}
                  <div className="flex items-center gap-4 text-xs text-dark-slate/40">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      <strong className="text-dark-slate/70">{idea._count.votes}</strong> votes
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <strong className="text-dark-slate/70">{idea._count.endorsements}</strong> contributors
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      {idea._count.comments}
                    </span>
                    <span className="ml-auto">by {idea.author.name ?? "Unknown"} · {timeAgo(idea.createdAt)}</span>
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
