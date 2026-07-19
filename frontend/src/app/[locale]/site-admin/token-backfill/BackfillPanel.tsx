"use client";

import { useState, useTransition } from "react";
import { runTokenBackfill } from "./actions";

export default function BackfillPanel({ disabled }: { disabled: boolean }) {
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
        Klart — {result.paid} kort fick tokens utdelade (totalt {Math.round(result.totalTokens)} tokens),
        {" "}{result.skippedNoPayee} hoppades över utan någon att betala ut till. Ladda om sidan om du vill
        kontrollera att listan nu är tom.
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="border border-amber-300 bg-amber-50 rounded-xl p-4">
        <p className="text-sm text-amber-900 mb-3">
          Det här mintar riktiga tokens till riktiga användarkonton och kan inte ångras med en knapptryckning.
          Är du säker?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRun}
            disabled={isPending}
            className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {isPending ? "Kör…" : "Ja, dela ut tokens nu"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="text-sm font-medium text-dark-slate/70 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Avbryt
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
      Kör bakfyllning
    </button>
  );
}
