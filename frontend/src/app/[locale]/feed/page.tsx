export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/auth";
import ActivityFeed from "@/components/ActivityFeed";
import { fetchActivityItems, getFeedInteractionData } from "@/lib/activityFeed";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FeedPage" });
  return buildMetadata({ locale, path: "/feed", title: t("pageTitle"), description: t("metaDescription") });
}

const PAGE_SIZE = 20;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const session = await auth();
  const t = await getTranslations("FeedPage");

  // Each source is over-fetched up to the current page's window, so `total` (and thus
  // pagination) grows as the user pages further rather than reflecting the true lifetime count.
  const allItems = await fetchActivityItems(page * PAGE_SIZE);
  const total = allItems.length;
  const pageItems = allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const isLoggedIn = !!session?.user?.id;
  const { likeCountByTarget, likedByMe, commentsByTarget, memberProjectIds, pendingJoinProjectIds } =
    await getFeedInteractionData(pageItems, session?.user?.id ?? null);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
        <p className="text-sm text-dark-slate/50 mt-1">{t("subtitle")}</p>
      </div>

      <ActivityFeed
        pageItems={pageItems}
        isLoggedIn={isLoggedIn}
        page={page}
        pageStr={pageStr}
        total={total}
        perPage={PAGE_SIZE}
        basePath="/feed"
        likeCountByTarget={likeCountByTarget}
        likedByMe={likedByMe}
        commentsByTarget={commentsByTarget}
        memberProjectIds={memberProjectIds}
        pendingJoinProjectIds={pendingJoinProjectIds}
        emptyMessage={t("emptyMessage")}
      />
    </div>
  );
}
