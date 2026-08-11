export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import type { Locale } from "next-intl";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AcademyPage" });
  return buildMetadata({ locale, path: "/academy", title: "GoodTribes Academy", description: t("pageDescription") });
}

const CATEGORY_COLORS: Record<string, string> = {
  Projektledning: "bg-blue-100 text-blue-700",
  Crowdfunding:   "bg-amber-100 text-amber-700",
  Community:      "bg-purple-100 text-purple-700",
  Teknik:         "bg-cyan-100 text-cyan-700",
  Impact:         "bg-green-100 text-green-700",
};

function difficultyBadge(difficulty: string, t: Awaited<ReturnType<typeof getTranslations>>) {
  const isAdvanced = difficulty === "avancerad" || difficulty === "advanced";
  const label = isAdvanced ? t("difficultyAdvanced") : t("difficultyBeginner");
  const cls = isAdvanced ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700";
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

export default async function AcademyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AcademyPage" });
  const { category } = await searchParams;

  const CATEGORIES = [
    { value: "", label: t("categoryAll") },
    { value: "Projektledning", label: t("categoryProjectManagement") },
    { value: "Crowdfunding", label: t("categoryCrowdfunding") },
    { value: "Community", label: t("categoryCommunity") },
    { value: "Teknik", label: t("categoryTech") },
    { value: "Impact", label: t("categoryImpact") },
  ];

  const where = {
    published: true,
    hiddenAt: null,
    ...(category ? { category } : {}),
  };

  const [session, guides] = await Promise.all([
    auth(),
    prisma.academyGuide.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true } },
        _count: { select: { completions: true } },
      },
    }),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-dark-slate">GoodTribes Academy</h1>
          <p className="text-sm text-dark-slate/60 mt-1 max-w-lg">{t("intro")}</p>
        </div>
        {session?.user?.id && (
          <Link
            href="/academy/new"
            className="flex-shrink-0 px-4 py-2 bg-coral text-white text-sm font-medium rounded-lg hover:bg-watermelon transition-colors"
          >
            {t("newGuideButton")}
          </Link>
        )}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => {
          const active = (category ?? "") === cat.value;
          const params = new URLSearchParams();
          if (cat.value) params.set("category", cat.value);
          const qs = params.toString();
          return (
            <Link
              key={cat.value}
              href={`/academy${qs ? `?${qs}` : ""}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                active
                  ? "bg-seagrass text-white"
                  : "bg-dry-sage text-dark-slate/70 hover:bg-muted-teal/30 hover:text-dark-slate"
              }`}
            >
              {cat.label}
            </Link>
          );
        })}
      </div>

      {/* Guide grid */}
      {guides.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-dark-slate/50">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {guides.map((guide) => {
            const catCls = CATEGORY_COLORS[guide.category] ?? "bg-gray-100 text-gray-600";
            return (
              <div
                key={guide.id}
                className="rounded-xl border border-muted-teal/40 bg-white p-5 flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Badges row */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${catCls}`}>
                    {guide.category}
                  </span>
                  {difficultyBadge(guide.difficulty, t)}
                </div>

                <h2 className="text-base font-semibold text-dark-slate leading-snug mb-2">
                  {guide.title}
                </h2>

                <div className="flex items-center gap-3 text-xs text-dark-slate/50 mb-4 mt-auto">
                  <span>{t("readTime", { minutes: guide.readTimeMinutes })}</span>
                  <span>{t("byAuthor", { name: guide.author.name ?? t("unknownAuthor") })}</span>
                  <span className="ml-auto">{t("completionCount", { count: guide._count.completions })}</span>
                </div>

                <Link
                  href={`/academy/${guide.id}`}
                  className="self-start px-4 py-1.5 bg-seagrass text-white text-sm font-medium rounded-lg hover:bg-seagrass/80 transition-colors"
                >
                  {t("readLink")}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
