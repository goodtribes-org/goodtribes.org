export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getGtBalance } from "@/lib/tokens";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import ShopItemCard from "./ShopItemCard";
import type { Locale } from "next-intl";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ShopPage" });
  return buildMetadata({ locale, path: "/shop", title: t("heading"), description: t("pageDescription") });
}

export default async function ShopPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [items, balance, redemptions, t] = await Promise.all([
    prisma.shopItem.findMany({
      where: { active: true },
      orderBy: { costGt: "asc" },
    }),
    userId ? getGtBalance(userId) : Promise.resolve(0),
    userId
      ? prisma.shopRedemption.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { item: { select: { name: true } } },
        })
      : Promise.resolve([]),
    getTranslations({ locale, namespace: "ShopPage" }),
  ]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
          <p className="text-sm text-dark-slate/60 mt-1">{t("intro")}</p>
        </div>
        {userId && (
          <div className="text-right">
            <p className="text-xs text-dark-slate/50 uppercase tracking-wide">{t("yourBalance")}</p>
            <p className="text-lg font-bold text-seagrass">{Math.round(balance * 10) / 10} GT</p>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-dark-slate/40 italic">{t("emptyState")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {items.map((item) => (
            <ShopItemCard
              key={item.id}
              id={item.id}
              name={item.name}
              description={item.description}
              imageUrl={item.imageUrl}
              costGt={item.costGt}
              balance={balance}
              isLoggedIn={!!userId}
            />
          ))}
        </div>
      )}

      {userId && redemptions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-dark-slate mb-3">{t("redemptionHistoryHeading")}</h2>
          <ul className="space-y-1.5">
            {redemptions.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm border border-dark-slate/10 rounded-lg px-3 py-2">
                <span className="text-dark-slate/80">{r.item.name}</span>
                <span className="text-dark-slate/50">
                  -{r.gtSpent} GT · {new Date(r.createdAt).toLocaleDateString("sv-SE")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
