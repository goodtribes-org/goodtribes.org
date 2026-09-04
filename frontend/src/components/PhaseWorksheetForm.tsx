"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

interface DecisionOption {
  value: string;
  labelKey: string;
}

interface DecisionField {
  key: string;
  value: string;
  options: readonly DecisionOption[];
}

interface Props {
  projectSlug: string;
  // Translation namespace for this worksheet — must define `${field}Label`/
  // `${field}Hint` per text field, `${decision.key}Label` + each option's
  // labelKey if a decision field is used, and the shared
  // edit/saving/save/cancel/emptyEditable/emptyReadOnly keys (same shape as
  // ProjectPlanForm's own namespace).
  namespace: string;
  textFields: readonly string[];
  values: Record<string, string | null>;
  decision?: DecisionField;
  canEdit: boolean;
  action: (projectSlug: string, formData: FormData) => Promise<void>;
}

// Shared "single free-text formalization document" editor behind
// PilotEvaluation/EstablishmentPlan/ScalingPlan/ImpactFollowup — same
// edit-toggle shape as ProjectPlanForm, generalized to an arbitrary list of
// textarea fields plus one optional enum decision (rendered as a <select>).
export default function PhaseWorksheetForm({ projectSlug, namespace, textFields, values, decision, canEdit, action }: Props) {
  const t = useTranslations(namespace);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await action(projectSlug, formData);
      setEditing(false);
    });
  }

  const hasAnyText = textFields.some((f) => values[f]);

  if (editing) {
    return (
      <form action={handleSave} className="flex flex-col gap-4">
        {textFields.map((field) => (
          <div key={field}>
            <label className="block text-xs font-bold text-dark-slate uppercase tracking-wide mb-1">
              {t(`${field}Label`)}
            </label>
            <p className="text-[10px] text-dark-slate/40 leading-tight mb-1.5">{t(`${field}Hint`)}</p>
            <textarea
              name={field}
              defaultValue={values[field] ?? ""}
              rows={4}
              placeholder={t(`${field}Hint`)}
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
            />
          </div>
        ))}
        {decision && (
          <div>
            <label className="block text-xs font-bold text-dark-slate uppercase tracking-wide mb-1">
              {t(`${decision.key}Label`)}
            </label>
            <select
              name={decision.key}
              defaultValue={decision.value}
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm bg-white"
            >
              {decision.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="bg-coral text-white text-sm font-medium px-4 py-1.5 rounded hover:bg-watermelon disabled:opacity-50 transition-colors"
          >
            {pending ? t("saving") : t("save")}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm text-dark-slate/50 hover:text-dark-slate transition-colors"
          >
            {t("cancel")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-dark-slate/40 hover:text-coral transition-colors"
          >
            {t("edit")}
          </button>
        </div>
      )}

      {decision && (
        <div className="border border-muted-teal/30 rounded-lg bg-white p-3">
          <h3 className="text-xs font-bold text-dark-slate uppercase tracking-wide">{t(`${decision.key}Label`)}</h3>
          <p className="text-sm text-dark-slate/80 mt-1">
            {t(decision.options.find((opt) => opt.value === decision.value)?.labelKey ?? decision.options[0].labelKey)}
          </p>
        </div>
      )}

      {hasAnyText ? (
        textFields.map((field) =>
          values[field] ? (
            <div key={field} className="border border-muted-teal/30 rounded-lg bg-white p-3">
              <h3 className="text-xs font-bold text-dark-slate uppercase tracking-wide">{t(`${field}Label`)}</h3>
              <p className="text-sm text-dark-slate/80 whitespace-pre-wrap leading-relaxed mt-1">
                {values[field]}
              </p>
            </div>
          ) : null
        )
      ) : !decision ? (
        <p className="text-sm text-dark-slate/30 italic">
          {canEdit ? t("emptyEditable") : t("emptyReadOnly")}
        </p>
      ) : null}
    </div>
  );
}
