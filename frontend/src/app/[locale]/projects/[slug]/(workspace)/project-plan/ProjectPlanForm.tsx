"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateProjectPlan } from "./actions";

interface Plan {
  goal: string | null;
  milestones: string | null;
  resources: string | null;
  risks: string | null;
  updatedAt: Date;
  updatedBy: { name: string | null } | null;
}

interface Props {
  projectSlug: string;
  plan: Plan | null;
  canEdit: boolean;
}

const FIELDS = ["goal", "milestones", "resources", "risks"] as const;
type Field = (typeof FIELDS)[number];

export default function ProjectPlanForm({ projectSlug, plan, canEdit }: Props) {
  const t = useTranslations("ProjectPlanForm");
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await updateProjectPlan(projectSlug, formData);
      setEditing(false);
    });
  }

  const values: Record<Field, string | null> = {
    goal: plan?.goal ?? null,
    milestones: plan?.milestones ?? null,
    resources: plan?.resources ?? null,
    risks: plan?.risks ?? null,
  };
  const hasAnyValue = FIELDS.some((f) => values[f]);

  if (editing) {
    return (
      <form action={handleSave} className="flex flex-col gap-4">
        {FIELDS.map((field) => (
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

      {hasAnyValue ? (
        FIELDS.map((field) =>
          values[field] ? (
            <div key={field} className="border border-muted-teal/30 rounded-lg bg-white p-3">
              <h3 className="text-xs font-bold text-dark-slate uppercase tracking-wide">{t(`${field}Label`)}</h3>
              <p className="text-sm text-dark-slate/80 whitespace-pre-wrap leading-relaxed mt-1">
                {values[field]}
              </p>
            </div>
          ) : null
        )
      ) : (
        <p className="text-sm text-dark-slate/30 italic">
          {canEdit ? t("emptyEditable") : t("emptyReadOnly")}
        </p>
      )}
    </div>
  );
}
