"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { runTokenBackfill } from "./actions";

export default function BackfillPanel({ disabled }: { disabled: boolean }) {
  const t = useTranslations("BackfillPanel");
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ paid: number; skippedNoPayee: number; totalTokens: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRun() {
    startTransition(async () => {
      const r = await runTokenBackfill();
      setResult(r);
      setConfirming(false);
    });
  }

  if (result) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-xl p-4 text-sm text-green-800">
        {t("resultSummary", {
          paid: result.paid,
          totalTokens: Math.round(result.totalTokens),
          skippedNoPayee: result.skippedNoPayee,
        })}
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="border border-amber-300 bg-amber-50 rounded-xl p-4">
        <p className="text-sm text-amber-900 mb-3">{t("confirmWarning")}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRun}
            disabled={isPending}
            className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {isPending ? t("runningLabel") : t("confirmRunLabel")}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="text-sm font-medium text-dark-slate/70 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {t("cancelLabel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      disabled={disabled}
      className="text-sm font-medium text-white bg-seagrass hover:bg-seagrass/80 px-4 py-2 rounded-lg disabled:opacity-40 transition-colors"
    >
      {t("runLabel")}
    </button>
  );
}
