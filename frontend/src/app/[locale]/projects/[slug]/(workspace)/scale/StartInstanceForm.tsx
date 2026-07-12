"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  parentSlug: string;
}

export default function StartInstanceForm({ parentSlug }: Props) {
  const router = useRouter();
  const [region, setRegion] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!region.trim() || !projectTitle.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentSlug, region: region.trim(), projectTitle: projectTitle.trim() }),
      });
      if (res.ok) {
        setSuccess(true);
        router.refresh();
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Något gick fel.");
      }
    } catch {
      setError("Något gick fel. Försök igen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <p className="text-sm text-seagrass font-medium">
        Din ansökan har skickats! Projektets ägare granskar den snart.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-dark-slate/70 mb-1">
          Projektnamn för din instans
        </label>
        <input
          type="text"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          placeholder="t.ex. GreenKids Stockholm"
          required
          className="w-full px-3 py-2 text-sm border border-muted-teal/40 rounded bg-white text-dark-slate placeholder-dark-slate/30 focus:outline-none focus:border-seagrass"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-dark-slate/70 mb-1">
          Region / stad
        </label>
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="t.ex. Stockholm, Sverige"
          required
          className="w-full px-3 py-2 text-sm border border-muted-teal/40 rounded bg-white text-dark-slate placeholder-dark-slate/30 focus:outline-none focus:border-seagrass"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !region.trim() || !projectTitle.trim()}
        className="px-4 py-2 rounded bg-coral text-white text-sm font-bold hover:bg-watermelon disabled:opacity-50 transition-colors"
      >
        {submitting ? "Skickar..." : "Ansök om instans"}
      </button>
    </form>
  );
}
