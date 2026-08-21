"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

interface Props {
  label: string;
  hint: string;
  value: string | null;
  canEdit: boolean;
  accent: "value" | "customer";
  onSave: (formData: FormData) => Promise<void>;
}

export default function ValuePropositionField({ label, hint, value, canEdit, accent, onSave }: Props) {
  const t = useTranslations("LeanCanvasBlock");
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await onSave(formData);
      setEditing(false);
    });
  }

  const labelColor = accent === "value" ? "text-coral" : "text-seagrass";
  const ringColor = accent === "value" ? "focus:ring-coral" : "focus:ring-seagrass";

  return (
    <div className="border border-muted-teal/25 rounded-lg bg-white p-2.5 flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2">
        <h4 className={`text-[11px] font-bold uppercase tracking-wide ${labelColor}`}>{label}</h4>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[10px] font-medium text-dark-slate/40 hover:text-coral shrink-0 transition-colors"
          >
            {t("edit")}
          </button>
        )}
      </div>
      <p className="text-[10px] text-dark-slate/40 leading-tight">{hint}</p>

      {editing ? (
        <form action={handleSave} className="flex flex-col gap-1.5 mt-0.5">
          <textarea
            name="value"
            defaultValue={value ?? ""}
            rows={3}
            autoFocus
            placeholder={hint}
            className={`w-full border border-muted-teal rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 ${ringColor} resize-none`}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-coral text-white text-[11px] font-medium px-2.5 py-1 rounded hover:bg-watermelon disabled:opacity-50 transition-colors"
            >
              {pending ? t("saving") : t("save")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[11px] text-dark-slate/50 hover:text-dark-slate transition-colors"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      ) : value ? (
        <p className="text-xs text-dark-slate/80 whitespace-pre-wrap leading-relaxed mt-0.5">{value}</p>
      ) : (
        <p className="text-xs text-dark-slate/30 italic mt-0.5">
          {canEdit ? t("emptyEditable") : t("emptyReadOnly")}
        </p>
      )}
    </div>
  );
}
