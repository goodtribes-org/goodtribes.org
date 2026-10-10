"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { proposeRevision } from "@/app/[locale]/projects/[slug]/revision-actions";
import RichTextEditor from "@/components/RichTextEditor";

export type ProposableField = { field: string; label: string; current: string | null; rich?: boolean };

// "Föreslå en ändring" (#290): a new text for a project field, with an
// optional why, sent to the project's leads. Shown to anyone logged in who
// can't edit the field themselves. With several fields, a choice first.
export default function ProposeChange({ slug, fields, variant = "link" }: { slug: string; fields: ProposableField[]; variant?: "link" | "button" }) {
  const t = useTranslations("ProjectRevisions");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState(fields[0]?.current ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const chosen = fields[index];
  if (!chosen) return null;

  function begin() {
    setIndex(0);
    setValue(fields[0].current ?? "");
    setReason("");
    setError(null);
    setSent(false);
    setOpen(true);
  }

  function pick(i: number) {
    setIndex(i);
    setValue(fields[i].current ?? "");
    setError(null);
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await proposeRevision(slug, chosen.field, value, reason);
      if ("error" in res) setError(t.has(`error.${res.error}`) ? t(`error.${res.error}` as Parameters<typeof t>[0]) : t("error.generic"));
      else setSent(true);
    });
  }

  return (
    <>
      {variant === "button" ? (
        <button type="button" onClick={begin} className="rounded-full border border-coral px-4 py-1.5 text-sm font-semibold text-coral hover:bg-coral/5">
          {t("propose")}
        </button>
      ) : (
        <button type="button" onClick={begin} className="mt-1 self-start text-xs font-medium text-coral hover:underline">
          {t("proposeShort")}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="propose-heading" onClick={() => setOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {sent ? (
              <>
                <h2 id="propose-heading" className="text-lg font-bold text-dark-slate">{t("sentHeading")}</h2>
                <p className="mt-2 text-sm text-dark-slate/70">{t("sentBody")}</p>
                <div className="mt-5 flex justify-end">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-watermelon">{t("close")}</button>
                </div>
              </>
            ) : (
              <>
                <h2 id="propose-heading" className="text-lg font-bold text-dark-slate">{t("dialogHeading")}</h2>
                <p className="mt-1 text-sm text-dark-slate/70">{t("dialogBody")}</p>

                {fields.length > 1 ? (
                  <label className="mt-4 block text-sm font-medium text-dark-slate">
                    {t("whichField")}
                    <select value={index} onChange={(e) => pick(Number(e.target.value))} className="mt-1 block w-full rounded-lg border border-muted-teal/50 px-3 py-2 text-sm">
                      {fields.map((f, i) => <option key={f.field} value={i}>{f.label}</option>)}
                    </select>
                  </label>
                ) : (
                  <p className="mt-4 text-sm font-semibold text-dark-slate">{chosen.label}</p>
                )}

                <div className="mt-2">
                  {chosen.rich ? (
                    <RichTextEditor key={chosen.field} content={value} onChange={setValue} ariaLabel={chosen.label} />
                  ) : (
                    <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={6} aria-label={chosen.label} className="w-full rounded-lg border border-muted-teal/50 px-3 py-2 text-sm" />
                  )}
                </div>

                <label className="mt-4 block text-sm font-medium text-dark-slate">
                  {t("reasonLabel")}
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={1000} placeholder={t("reasonPlaceholder")} className="mt-1 w-full rounded-lg border border-muted-teal/50 px-3 py-2 text-sm font-normal" />
                </label>

                {error && <p className="mt-2 text-sm text-watermelon">{error}</p>}
                <div className="mt-5 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setOpen(false)} className="text-sm text-dark-slate/60 hover:text-dark-slate">{t("cancel")}</button>
                  <button type="button" onClick={submit} disabled={pending} className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-50">
                    {pending ? t("sending") : t("send")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
