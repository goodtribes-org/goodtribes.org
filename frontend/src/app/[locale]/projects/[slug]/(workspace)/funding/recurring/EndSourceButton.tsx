"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { endRecurringFundingSource } from "./actions";

export default function EndSourceButton({ id, projectSlug }: { id: string; projectSlug: string }) {
  const t = useTranslations("RecurringFundingPage");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await endRecurringFundingSource(id, projectSlug);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="shrink-0 text-xs font-medium text-dark-slate/40 hover:text-dark-slate transition-colors disabled:opacity-50"
    >
      {t("endSourceButton")}
    </button>
  );
}
