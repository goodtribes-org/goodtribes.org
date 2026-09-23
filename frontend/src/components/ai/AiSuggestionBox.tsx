"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ignoreAiSuggestion, applyAiSuggestion } from "@/lib/actions/aiSuggestions";

/**
 * An AI suggestion shown next to a field instead of written into it
 * ("AI hjälper mig", or a field that already has human text). The human
 * decides: Använd (put it in as-is), Använd delar (open the editor with the
 * suggestion to adapt), or Ignorera.
 */
export default function AiSuggestionBox({
  suggestion,
  canEdit,
  onUseParts,
}: {
  suggestion: { id: string; content: string };
  canEdit: boolean;
  onUseParts: () => void;
}) {
  const t = useTranslations("AiSuggestion");
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();
  if (hidden) return null;

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        setHidden(true);
      } catch {
        // leave it visible; the user can try again
      }
    });
  }

  return (
    <div className="mt-2 rounded-md border border-dashed border-coral/50 bg-coral/5 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-coral">{t("label")}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-dark-slate/80">{suggestion.content}</p>
      {canEdit && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium">
          <button type="button" disabled={pending} onClick={() => run(() => applyAiSuggestion(suggestion.id))} className="text-coral hover:text-watermelon disabled:opacity-50">
            {t("use")}
          </button>
          <button type="button" disabled={pending} onClick={onUseParts} className="text-dark-slate/70 hover:text-dark-slate disabled:opacity-50">
            {t("useParts")}
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => ignoreAiSuggestion(suggestion.id))} className="text-dark-slate/40 hover:text-dark-slate disabled:opacity-50">
            {t("ignore")}
          </button>
        </div>
      )}
    </div>
  );
}
