"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { closePoll } from "../actions";

interface Props {
  pollId: string;
  projectSlug: string;
}

export default function CloseButton({ pollId, projectSlug }: Props) {
  const t = useTranslations("CloseButton");
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (!confirm(t("confirmClose"))) return;
    startTransition(async () => {
      await closePoll(pollId, projectSlug);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClose}
      disabled={isPending}
      className="text-xs text-dark-slate/50 hover:text-watermelon transition-colors disabled:opacity-60"
    >
      {isPending ? t("closing") : t("closePoll")}
    </button>
  );
}
