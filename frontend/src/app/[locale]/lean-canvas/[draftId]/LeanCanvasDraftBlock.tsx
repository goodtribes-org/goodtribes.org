"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateLeanCanvasDraftBlock } from "../actions";
import type { LeanCanvasField } from "../../projects/[slug]/(workspace)/lean-canvas/fields";

interface Props {
  draftId: string;
  field: LeanCanvasField;
  area: string;
  label: string;
  hint: string;
  value: string | null;
  canEdit: boolean;
}

export default function LeanCanvasDraftBlock({ draftId, field, area, label, hint, value, canEdit }: Props) {
  const t = useTranslations("LeanCanvasBlock");
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await updateLeanCanvasDraftBlock(draftId, field, formData);
      setEditing(false);
    });
  }

  return (
    <div
      data-area={area}
      className="border border-muted-teal/30 rounded-lg bg-white p-3 flex flex-col min-h-[150px]"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <h3 className="text-xs font-bold text-dark-slate uppercase tracking-wide">{label}</h3>
          <p className="text-[10px] text-dark-slate/40 leading-tight mt-0.5">{hint}</p>
        </div>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-[10px] font-medium text-dark-slate/40 hover:text-coral shrink-0 transition-colors"
          >
            {t("edit")}
          </button>
        )}
      </div>

      {editing ? (
        <form action={handleSave} className="flex-1 flex flex-col gap-2 mt-1">
          <textarea
            name="value"
            defaultValue={value ?? ""}
            rows={5}
            autoFocus
            placeholder={hint}
            className="w-full flex-1 border border-muted-teal rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-coral text-white text-xs font-medium px-3 py-1 rounded hover:bg-watermelon disabled:opacity-50 transition-colors"
            >
              {pending ? t("saving") : t("save")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-dark-slate/50 hover:text-dark-slate transition-colors"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      ) : value ? (
        <p className="text-xs text-dark-slate/80 whitespace-pre-wrap leading-relaxed mt-1 flex-1">{value}</p>
      ) : (
        <p className="text-xs text-dark-slate/30 italic mt-1 flex-1">
          {canEdit ? t("emptyEditable") : t("emptyReadOnly")}
        </p>
      )}
    </div>
  );
}
