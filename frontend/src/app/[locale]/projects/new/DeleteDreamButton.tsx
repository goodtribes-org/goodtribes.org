"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteDreamConversation } from "./samtal/actions";

// "Radera" next to a paused conversation in "Fortsätt samtalet". Same
// action and inline confirmation as on the conversation page (DreamActions).
export default function DeleteDreamButton({ roomId }: { roomId: string }) {
  const t = useTranslations("DreamConversation");
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="shrink-0 text-xs text-dark-slate/40 hover:text-watermelon">
        {t("deleteShort")}
      </button>
    );
  }
  return (
    <span className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
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
  );
}
