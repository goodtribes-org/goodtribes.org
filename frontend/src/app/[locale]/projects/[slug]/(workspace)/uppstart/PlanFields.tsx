"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { saveUppstartPlan, type UppstartPlanPatch } from "./actions";

export type PlanField = {
  key: keyof UppstartPlanPatch;
  label: string;
  value: string | null;
  placeholder?: string;
  rows?: number;
  // A choice instead of free text (the kind of smallest version).
  options?: { value: string; label: string; hint: string }[];
};

// A few of the Uppstart plan's fields, shown as text and edited in place by
// a lead. Open for writing as long as any field is empty, so a lead never
// has to click to see what's left to fill in.
export default function PlanFields({ slug, fields, canEdit }: { slug: string; fields: PlanField[]; canEdit: boolean }) {
  const t = useTranslations("UppstartOverview");
  const router = useRouter();
  const complete = fields.every((f) => !!f.value?.trim());
  const initial = () => Object.fromEntries(fields.map((f) => [f.key, f.value ?? ""])) as Record<string, string>;
  const [editing, setEditing] = useState(canEdit && !complete);
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveUppstartPlan(slug, values);
      if (res.error) setError(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-3">
        {fields.map((f) => {
          const shown = f.options ? f.options.find((o) => o.value === f.value)?.label : f.value?.trim();
          return (
            <div key={f.key}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{f.label}</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-dark-slate/80">{shown || <span className="text-dark-slate/40">—</span>}</p>
            </div>
          );
        })}
        {canEdit && (
          <button type="button" onClick={() => { setValues(initial()); setEditing(true); }} className="self-start text-sm font-medium text-seagrass hover:underline">
            {t("edit")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.map((f) => (
        <label key={f.key} className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{f.label}</span>
          {f.options ? (
            <span className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {f.options.map((o) => {
                const on = values[f.key] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setValues((v) => ({ ...v, [f.key]: on ? "" : o.value }))}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${on ? "border-seagrass bg-seagrass/10 text-dark-slate" : "border-muted-teal/30 text-dark-slate/70 hover:border-seagrass/60"}`}
                  >
                    <span className="block font-semibold">{o.label}</span>
                    <span className="block text-xs text-dark-slate/60">{o.hint}</span>
                  </button>
                );
              })}
            </span>
          ) : (
            <textarea
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              rows={f.rows ?? 2}
              className="rounded-lg border border-muted-teal/40 px-3 py-2 text-sm text-dark-slate focus:border-seagrass focus:outline-none"
            />
          )}
        </label>
      ))}
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="rounded-lg bg-seagrass px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {pending ? t("saving") : t("save")}
        </button>
        {complete && (
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-dark-slate/60 hover:text-dark-slate">
            {t("cancel")}
          </button>
        )}
        {error && <span className="text-xs text-watermelon">{error}</span>}
      </div>
    </div>
  );
}
