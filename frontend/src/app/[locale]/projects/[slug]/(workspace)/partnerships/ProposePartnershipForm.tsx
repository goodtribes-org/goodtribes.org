"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { proposePartnership } from "@/lib/actions/partnerships";

export default function ProposePartnershipForm({ projectSlug }: { projectSlug: string }) {
  const t = useTranslations("WorkspaceProposePartnershipForm");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [organisationSlug, setOrganisationSlug] = useState("");
  const [type, setType] = useState("sponsor");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await proposePartnership("project", organisationSlug.trim(), projectSlug, type, description.trim() || null);
        setSuccess(true);
        router.refresh();
      } catch {
        setError(t("genericError"));
      }
    });
  }

  if (success) {
    return <p className="text-sm text-seagrass font-medium">{t("successMessage")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("organisationSlugLabel")}</label>
        <input
          value={organisationSlug}
          onChange={(e) => setOrganisationSlug(e.target.value)}
          required
          placeholder={t("organisationSlugPlaceholder")}
          className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("typeLabel")}</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-seagrass"
        >
          <option value="sponsor">{t("typeSponsor")}</option>
          <option value="partner">{t("typePartner")}</option>
          <option value="supporter">{t("typeSupporter")}</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("descriptionLabel")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass resize-none"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !organisationSlug.trim()}
        className="bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors disabled:opacity-50"
      >
        {isPending ? t("submitting") : t("submitButton")}
      </button>
    </form>
  );
}
