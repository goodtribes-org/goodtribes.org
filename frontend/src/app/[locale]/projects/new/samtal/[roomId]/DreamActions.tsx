"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { deleteDreamConversation } from "../actions";

// "Pausa och fortsätt senare" and deleting the conversation. Deleting asks
// for confirmation inline (the app has no confirm() dialogs).
export default function DreamActions({ roomId }: { roomId: string }) {
  const t = useTranslations("DreamConversation");
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <Link href="/projects/new" className="text-dark-slate/60 hover:text-dark-slate underline-offset-2 hover:underline">
        {t("pause")}
      </Link>
      {confirming ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-dark-slate/70">{t("deleteConfirm")}</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => deleteDreamConversation(roomId))}
            className="rounded bg-watermelon px-2 py-1 font-medium text-white disabled:opacity-50"
          >
            {t("deleteYes")}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-dark-slate/60 hover:text-dark-slate">
            {t("deleteNo")}
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="text-dark-slate/40 hover:text-watermelon">
          {t("delete")}
        </button>
      )}
    </div>
  );
}
