"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { approveAiDraft, confirmAiGuess } from "@/lib/actions/fieldProvenance";

// One AI guess in "Börja här": Stämmer makes it known, Vet inte keeps it as
// an assumption to test — both count it as answered, so the page brings up
// the next one. Ändra jumps to the field's section (CollapsibleSection opens
// it).
export default function GuessCard({
  slug,
  fieldKey,
  label,
  text,
  anchor,
}: {
  slug: string;
  fieldKey: string;
  label: string;
  text: string;
  anchor: string;
}) {
  const t = useTranslations("IdeaStart");
  const tProv = useTranslations("FieldProvenance");
  const [answered, setAnswered] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [entity, field] = fieldKey.split(".");

  function answer(action: typeof confirmAiGuess) {
    setAnswered(true);
    setFailed(false);
    startTransition(async () => {
      try {
        await action(slug, entity, field);
      } catch {
        setAnswered(false);
        setFailed(true);
      }
    });
  }

  if (answered) return null;

  return (
    <li className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{label}</span>
        <span className="rounded-full border border-amber-300 bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-800">{tProv("aiGuess")}</span>
      </div>
      <p className="mt-1 whitespace-pre-line text-sm text-dark-slate/85">{text}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => answer(confirmAiGuess)}
          disabled={pending}
          title={tProv("confirmHint")}
          className="rounded-md bg-seagrass px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {tProv("confirm")}
        </button>
        <a href={`#${anchor}`} className="rounded-md border border-muted-teal/60 bg-white px-3 py-1 text-xs font-medium text-dark-slate/70 hover:bg-dry-sage/20">
          {t("edit")}
        </a>
        <button
          type="button"
          onClick={() => answer(approveAiDraft)}
          disabled={pending}
          title={tProv("keepHint")}
          className="rounded-md px-3 py-1 text-xs font-medium text-dark-slate/55 hover:text-dark-slate"
        >
          {t("keep")}
        </button>
      </div>
      {failed && <p className="mt-1 text-xs text-watermelon">{t("answerFailed")}</p>}
    </li>
  );
}
