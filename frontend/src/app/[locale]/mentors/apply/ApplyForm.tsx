"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { applyAsMentor } from "../actions";

// value is the canonical stored category name (kept in Swedish so mentor
// records stay consistent regardless of the applicant's locale); key is the
// translation key used only for the displayed label.
const CATEGORIES = [
  { value: "Teknik", key: "categoryTeknik" },
  { value: "Produktutveckling", key: "categoryProduktutveckling" },
  { value: "Design & UX", key: "categoryDesignUx" },
  { value: "Affärsutveckling", key: "categoryAffarsutveckling" },
  { value: "Fundraising", key: "categoryFundraising" },
  { value: "Kommunikation", key: "categoryKommunikation" },
  { value: "Juridik", key: "categoryJuridik" },
  { value: "Hälsa", key: "categoryHalsa" },
  { value: "Utbildning", key: "categoryUtbildning" },
  { value: "Miljö & Klimat", key: "categoryMiljoKlimat" },
  { value: "Samhälle", key: "categorySamhalle" },
  { value: "Data & AI", key: "categoryDataAi" },
] as const;

export default function ApplyForm() {
  const t = useTranslations("ApplyForm");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await applyAsMentor(formData);
      if (result?.success) {
        setSuccess(true);
      } else if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (success) {
    return (
      <div className="max-w-lg py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-seagrass/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-seagrass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("successTitle")}</h2>
        <p className="text-dark-slate/70 mb-6">{t("successMessage")}</p>
        <a
          href="/mentors"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-coral text-white text-sm font-medium rounded-xl hover:bg-watermelon transition-colors"
        >
          {t("backToMentors")}
        </a>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6 max-w-lg">
      {error && (
        <p className="text-sm text-watermelon bg-watermelon/10 px-4 py-2 rounded-lg">{error}</p>
      )}

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-dark-slate mb-1">
          {t("bioLabel")} <span className="text-watermelon">*</span>
        </label>
        <p className="text-xs text-dark-slate/50 mb-2">{t("bioHelper")}</p>
        <textarea
          id="bio"
          name="bio"
          rows={6}
          required
          placeholder={t("bioPlaceholder")}
          className="w-full border border-muted-teal rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-dark-slate mb-1">
          {t("categoriesLabel")} <span className="text-watermelon">*</span>
        </p>
        <p className="text-xs text-dark-slate/50 mb-3">{t("categoriesHelper")}</p>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => (
            <label key={cat.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="categories"
                value={cat.value}
                className="accent-seagrass w-4 h-4 flex-shrink-0"
              />
              <span className="text-sm text-dark-slate">{t(cat.key)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-8 py-2.5 bg-coral text-white text-sm font-medium rounded-xl hover:bg-watermelon transition-colors disabled:opacity-60"
        >
          {isPending ? t("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}
