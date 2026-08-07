"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { redeemShopItem } from "./actions";

export default function ShopItemCard({
  id,
  name,
  description,
  imageUrl,
  costGt,
  balance,
  isLoggedIn,
}: {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  costGt: number;
  balance: number;
  isLoggedIn: boolean;
}) {
  const t = useTranslations("ShopItemCard");
  const [redeemed, setRedeemed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canAfford = balance >= costGt;

  function handleRedeem() {
    if (!confirm(t("confirmRedeem", { name, costGt }))) return;
    setError(null);
    startTransition(async () => {
      const res = await redeemShopItem(id);
      if (!res.ok) {
        setError(res.error === "Insufficient GT balance" ? t("insufficientBalanceError") : t("genericError"));
        return;
      }
      setRedeemed(true);
    });
  }

  return (
    <div className="border border-muted-teal/30 rounded-xl p-4 flex flex-col">
      {imageUrl && (
        <div className="w-full h-32 rounded-md overflow-hidden mb-3 bg-dry-sage/20">
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-dark-slate">{name}</h3>
      {description && <p className="text-xs text-dark-slate/60 mt-1 flex-1">{description}</p>}
      <div className="flex items-center justify-between mt-3">
        <span className="text-sm font-bold text-seagrass">{costGt} GT</span>
        {redeemed ? (
          <span className="text-xs font-medium text-seagrass">✓ {t("redeemedLabel")}</span>
        ) : !isLoggedIn ? (
          <a href="/login" className="text-xs font-medium text-dark-slate/50 hover:text-dark-slate">
            {t("loginLink")}
          </a>
        ) : (
          <button
            type="button"
            disabled={!canAfford || isPending}
            onClick={handleRedeem}
            className="text-xs font-medium text-white bg-coral hover:bg-watermelon rounded-md px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={!canAfford ? t("notEnoughGtTitle") : undefined}
          >
            {isPending ? t("redeeming") : t("redeemButton")}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-coral mt-2">{error}</p>}
    </div>
  );
}
