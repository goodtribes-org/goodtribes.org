"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Props {
  parentSlug: string;
}

export default function StartInstanceForm({ parentSlug }: Props) {
  const t = useTranslations("StartInstanceForm");
  const router = useRouter();
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!region.trim() || !country.trim() || !projectTitle.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentSlug,
          region: region.trim(),
          country: country.trim(),
          projectTitle: projectTitle.trim(),
        }),
      });
      if (res.ok) {
        setSuccess(true);
        router.refresh();
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? t("genericError"));
      }
    } catch {
      setError(t("genericErrorRetry"));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <p className="text-sm text-seagrass font-medium">
        {t("successMessage")}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-dark-slate/70 mb-1">
          {t("projectNameLabel")}
        </label>
        <input
          type="text"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          placeholder={t("projectNamePlaceholder")}
          required
          className="w-full px-3 py-2 text-sm border border-muted-teal/40 rounded bg-white text-dark-slate placeholder-dark-slate/30 focus:outline-none focus:border-seagrass"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-dark-slate/70 mb-1">
          {t("regionLabel")}
        </label>
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder={t("regionPlaceholder")}
          required
          className="w-full px-3 py-2 text-sm border border-muted-teal/40 rounded bg-white text-dark-slate placeholder-dark-slate/30 focus:outline-none focus:border-seagrass"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-dark-slate/70 mb-1">
          {t("countryLabel")}
        </label>
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder={t("countryPlaceholder")}
          required
          className="w-full px-3 py-2 text-sm border border-muted-teal/40 rounded bg-white text-dark-slate placeholder-dark-slate/30 focus:outline-none focus:border-seagrass"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !region.trim() || !country.trim() || !projectTitle.trim()}
        className="px-4 py-2 rounded bg-coral text-white text-sm font-bold hover:bg-watermelon disabled:opacity-50 transition-colors"
      >
        {submitting ? t("submittingButton") : t("submitButton")}
      </button>
    </form>
  );
}
