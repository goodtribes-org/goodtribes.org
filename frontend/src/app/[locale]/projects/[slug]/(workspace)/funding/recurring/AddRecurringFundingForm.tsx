"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addRecurringFundingSource } from "./actions";

export default function AddRecurringFundingForm({ projectSlug }: { projectSlug: string }) {
  const t = useTranslations("RecurringFundingPage");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await addRecurringFundingSource(projectSlug, formData);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } catch {
        setError(t("genericError"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="border border-muted-teal/40 rounded-lg p-4 bg-white space-y-3 mb-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("labelLabel")}</label>
          <input
            name="label"
            required
            className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("typeLabel")}</label>
          <select name="type" defaultValue="MEMBERSHIP_FEES" className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm bg-white">
            <option value="MEMBERSHIP_FEES">{t("typeMembershipFees")}</option>
            <option value="GRANT">{t("typeGrant")}</option>
            <option value="SUBSCRIPTION">{t("typeSubscription")}</option>
            <option value="REVENUE_SHARE">{t("typeRevenueShare")}</option>
            <option value="OTHER">{t("typeOther")}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("intervalLabel")}</label>
          <select name="interval" defaultValue="MONTHLY" className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm bg-white">
            <option value="MONTHLY">{t("intervalMonthly")}</option>
            <option value="QUARTERLY">{t("intervalQuarterly")}</option>
            <option value="ANNUALLY">{t("intervalAnnually")}</option>
            <option value="OTHER">{t("intervalOther")}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("amountLabel")}</label>
          <input
            name="amountSek"
            type="number"
            min="1"
            required
            className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("sourceNameLabel")}</label>
          <input
            name="sourceName"
            className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("noteLabel")}</label>
          <textarea
            name="note"
            rows={2}
            className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass resize-none"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors disabled:opacity-50"
      >
        {isPending ? t("submitting") : t("submitButton")}
      </button>
    </form>
  );
}
