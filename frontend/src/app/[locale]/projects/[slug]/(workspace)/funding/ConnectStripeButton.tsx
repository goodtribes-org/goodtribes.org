"use client";

import { useState } from "react";

export default function ConnectStripeButton({
  campaignId,
  slug,
  status,
}: {
  campaignId: string;
  slug: string;
  status: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, slug }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        setError((data as { error?: string })?.error ?? "Kunde inte starta anslutning.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Nätverksfel — försök igen.");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
      <p className="text-sm text-amber-800">
        {status === "pending"
          ? "Stripe-anslutningen är påbörjad men inte klar — slutför onboardingen för att kunna ta emot riktiga betalningar."
          : "Anslut ett Stripe-konto för att kunna ta emot riktiga betalningar till projektet."}
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
      >
        {loading ? "Omdirigerar…" : status === "pending" ? "Fortsätt onboarding" : "Anslut Stripe-konto"}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
