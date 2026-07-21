"use client";

import { useState } from "react";

export default function NetworkInsightsButton({ parentSlug }: { parentSlug: string }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/network-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string })?.error ?? "Något gick fel.");
      } else {
        setInsights((data as { insights: string }).insights);
      }
    } catch {
      setError("Något gick fel. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="text-sm font-medium text-seagrass hover:text-dark-slate border border-seagrass/40 hover:border-dark-slate/40 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
      >
        {loading ? "Genererar…" : "Generera AI-insikter"}
      </button>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      {insights && (
        <div className="mt-3 border border-muted-teal/30 rounded-lg p-4 text-sm text-dark-slate/80 leading-relaxed whitespace-pre-wrap">
          {insights}
        </div>
      )}
    </div>
  );
}
