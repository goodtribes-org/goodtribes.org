"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { expressOwnershipInterest, withdrawOwnershipInterest } from "@/app/[locale]/projects/[slug]/ownership-actions";

export default function OwnershipBanner({
  slug,
  isFounder,
  userId,
  alreadyExpressedInterest,
}: {
  slug: string;
  isFounder: boolean;
  userId: string | null;
  alreadyExpressedInterest: boolean;
}) {
  const t = useTranslations("OwnershipBanner");
  const [expressed, setExpressed] = useState(alreadyExpressedInterest);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await expressOwnershipInterest(slug, message);
      if (!("error" in res)) {
        setExpressed(true);
        setShowForm(false);
      }
    });
  }

  function handleWithdraw() {
    startTransition(async () => {
      const res = await withdrawOwnershipInterest(slug);
      if (!("error" in res)) setExpressed(false);
    });
  }

  return (
    <div className="mb-6 border-2 border-amber-300 bg-amber-50/60 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-dark-slate">{t("seekingOwnerTitle")}</p>
          <p className="text-xs text-dark-slate/60 mt-0.5">
            {t("seekingOwnerDescription")}
          </p>
        </div>

        {isFounder ? (
          <Link
            href={`/projects/${slug}/edit`}
            className="text-sm font-medium text-amber-700 border border-amber-400 rounded-md px-4 py-2 hover:bg-amber-100 transition-colors flex-shrink-0"
          >
            {t("manageInterestLink")}
          </Link>
        ) : !userId ? (
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`/projects/${slug}`)}`}
            className="text-sm font-medium text-amber-700 border border-amber-400 rounded-md px-4 py-2 hover:bg-amber-100 transition-colors flex-shrink-0"
          >
            {t("loginToExpressInterest")}
          </Link>
        ) : expressed ? (
          <button
            type="button"
            disabled={isPending}
            onClick={handleWithdraw}
            className="text-sm font-medium text-dark-slate/60 border border-dark-slate/20 rounded-md px-4 py-2 hover:bg-white transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {isPending ? t("savingLabel") : t("withdrawLabel")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="text-sm font-medium text-white bg-coral hover:bg-watermelon rounded-md px-4 py-2 transition-colors flex-shrink-0"
          >
            {t("takeOverButton")}
          </button>
        )}
      </div>

      {showForm && !expressed && userId && (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("messagePlaceholder")}
            rows={2}
            className="w-full border border-amber-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-dark-slate/50 hover:text-dark-slate transition-colors">
              {t("cancelButton")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="text-sm font-medium text-white bg-coral hover:bg-watermelon rounded-md px-4 py-2 transition-colors disabled:opacity-60"
            >
              {isPending ? t("sendingLabel") : t("submitButton")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
