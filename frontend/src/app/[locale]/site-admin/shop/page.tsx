import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import ShopItemsEditor from "./ShopItemsEditor";
import type { Locale } from "next-intl";

export default async function ShopAdminPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [items, t] = await Promise.all([
    prisma.shopItem.findMany({ orderBy: { createdAt: "desc" } }),
    getTranslations({ locale, namespace: "ShopAdminPage" }),
  ]);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
        <p className="text-sm text-dark-slate/60 mt-1">{t("intro")}</p>
      </div>
      <ShopItemsEditor initialItems={items} />
    </div>
  );
}
