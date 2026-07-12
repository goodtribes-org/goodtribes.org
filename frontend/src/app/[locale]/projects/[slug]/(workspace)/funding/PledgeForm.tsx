"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { formatCurrency } from "@/lib/currency";

type RewardTier = {
  id: string;
  title: string;
  description: string | null;
  minAmount: number;
  maxBackers: number | null;
  _count?: { pledges: number };
};

type Props = {
  campaignId: string;
  currency: string;
  rewardTiers?: RewardTier[];
  platformFee: number;
  existingPledgeAmount?: number;
};

export default function PledgeForm({
  campaignId,
  currency,
  rewardTiers,
  platformFee,
  existingPledgeAmount,
}: Props) {
  const locale = useLocale();
  const fmt = (amount: number, currency: string) => formatCurrency(amount, currency, locale);
  const [selectedAmount, setSelectedAmount] = useState<number>(
    existingPledgeAmount ?? 0
  );
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feeAmount =
    selectedAmount > 0 ? Math.round((selectedAmount * platformFee) / 100) : 0;

  function selectTier(tier: RewardTier) {
    setSelectedTierId(tier.id);
    if (selectedAmount < tier.minAmount) {
      setSelectedAmount(tier.minAmount);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAmount || selectedAmount < 10) {
      setError("Minsta belopp är 10.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          amount: selectedAmount,
          currency,
          message: message || null,
          rewardTierId: selectedTierId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const notConfigured =
          res.status === 503 ||
          (data as { code?: string })?.code === "no_stripe" ||
          String((data as { error?: string })?.error ?? "").toLowerCase().includes("not configured");
        if (notConfigured) {
          setError("Betalningar är inte aktiverade ännu.");
        } else {
          setError((data as { error?: string })?.error ?? "Något gick fel. Försök igen.");
        }
        setLoading(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError("Kunde inte starta betalning. Försök igen.");
        setLoading(false);
      }
    } catch {
      setError("Nätverksfel — kontrollera din anslutning och försök igen.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Reward tier selection */}
      {rewardTiers && rewardTiers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest">
            Välj belöningsnivå
          </p>
          <div className="space-y-2">
            {rewardTiers.map((tier) => {
              const backerCount = tier._count?.pledges ?? 0;
              const isFull =
                tier.maxBackers !== null && backerCount >= tier.maxBackers;
              const isSelected = selectedTierId === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  disabled={isFull}
                  onClick={() => selectTier(tier)}
                  className={[
                    "w-full text-left px-4 py-3 rounded-lg border transition-colors",
                    isFull
                      ? "opacity-40 cursor-not-allowed border-muted-teal/30 bg-dry-sage/30"
                      : isSelected
                      ? "border-seagrass bg-seagrass/5 ring-1 ring-seagrass"
                      : "border-muted-teal/40 hover:border-seagrass hover:bg-seagrass/5",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-dark-slate">
                      {tier.title}
                    </span>
                    <span className="text-sm font-semibold text-seagrass whitespace-nowrap">
                      {fmt(tier.minAmount, currency)}+
                    </span>
                  </div>
                  {tier.description && (
                    <p className="text-xs text-dark-slate/50 mt-0.5">
                      {tier.description}
                    </p>
                  )}
                  {tier.maxBackers !== null && (
                    <p className="text-xs text-dark-slate/40 mt-1">
                      {backerCount} / {tier.maxBackers} finansiärer
                      {isFull && " — full"}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Amount input */}
      <div>
        <label className="block text-xs font-medium text-dark-slate/60 mb-1">
          Belopp ({currency})
        </label>
        <input
          type="number"
          min="10"
          required
          value={selectedAmount || ""}
          onChange={(e) => setSelectedAmount(parseInt(e.target.value) || 0)}
          placeholder="Ange belopp"
          className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
        />
        {feeAmount > 0 && (
          <p className="text-xs text-dark-slate/40 mt-1">
            GoodTribes-avgift: {platformFee}% = {fmt(feeAmount, currency)} · Du
            bidrar med{" "}
            <span className="font-medium text-dark-slate/60">
              {fmt(selectedAmount - feeAmount, currency)}
            </span>{" "}
            netto till projektet
          </p>
        )}
      </div>

      {/* Message */}
      <div>
        <label className="block text-xs font-medium text-dark-slate/60 mb-1">
          Meddelande (valfritt)
        </label>
        <textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Skriv ett uppmuntrande meddelande..."
          className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass resize-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !selectedAmount || selectedAmount < 10}
        className="w-full bg-coral text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-watermelon transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Omdirigerar till betalning…" : "Stöd projektet"}
      </button>
    </form>
  );
}
