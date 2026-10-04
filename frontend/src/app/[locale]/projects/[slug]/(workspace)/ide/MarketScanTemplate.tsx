"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  addMarketScanEntry,
  confirmMarketScanEntry,
  deleteMarketScanEntry,
  runMarketScanAction,
  saveMarketScanConclusion,
} from "../market-scan/actions";

// Omvärldsbevakningen as a template (#207): four kinds of find (the
// MarketScanEntry types), each with its question and the canvas fields it
// builds on, and a conclusion that feeds the canvas. A team doing it by hand
// fills the template; with AI on, "Ta fram omvärldsbevakningen" has the AI
// search from the canvas and fill it — every find sourced, tied to a canvas
// field, and checked by the team ("✓ Stämmer") or removed.

export type ScanEntry = {
  id: string;
  type: string;
  name: string;
  description: string;
  relevanceNote: string | null;
  sourceUrl: string | null;
  createdByAi: boolean;
  linkedField: string | null;
  confirmedAt: string | null;
};

type Conclusion = { strengths: string | null; gap: string | null; firstContacts: string | null; createdByAi: boolean } | null;

const SECTIONS = [
  { type: "COMPETITOR", fields: ["leanCanvas.customerSegments", "leanCanvas.jobsToBeDone", "leanCanvas.alternatives"] },
  { type: "PARTNER_PROSPECT", fields: ["leanCanvas.channels", "leanCanvas.costStructure"] },
  { type: "TREND", fields: ["leanCanvas.purpose", "leanCanvas.impact"] },
  { type: "REGULATION", fields: ["leanCanvas.solution"] },
] as const;

const STRIP_FIELDS = ["leanCanvas.customerSegments", "leanCanvas.jobsToBeDone", "leanCanvas.solution"] as const;

export default function MarketScanTemplate({
  slug,
  canEdit,
  aiButton,
  canvas,
  fieldLabels,
  entries,
  conclusion,
}: {
  slug: string;
  canEdit: boolean;
  aiButton: boolean;
  canvas: Record<string, string | null>;
  fieldLabels: Record<string, string>;
  entries: ScanEntry[];
  conclusion: Conclusion;
}) {
  const t = useTranslations("MarketScanTemplate");
  const router = useRouter();
  const [running, startRun] = useTransition();
  const [runNote, setRunNote] = useState<{ text: string; error: boolean } | null>(null);
  const label = (key: string) => fieldLabels[key] ?? key;
  const aiCount = entries.filter((e) => e.createdByAi).length;

  function run() {
    setRunNote(null);
    startRun(async () => {
      const res = await runMarketScanAction(slug);
      if ("error" in res) setRunNote({ text: res.error, error: true });
      else {
        setRunNote({ text: t("aiFound", { count: res.found }), error: false });
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {aiButton && aiCount === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-seagrass/40 bg-seagrass/5 px-5 py-5 text-center">
          <span className="rounded-full bg-seagrass px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">{t("recommended")}</span>
          <p className="text-lg font-semibold text-dark-slate">{t("aiHeading")}</p>
          <p className="max-w-xl text-sm text-dark-slate/70">{t("aiBody")}</p>
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-full bg-seagrass px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-seagrass/90 disabled:opacity-60"
          >
            <span aria-hidden>✨</span> {running ? t("aiRunning") : t("aiRun")}
          </button>
          {runNote && <p className={`text-xs ${runNote.error ? "text-watermelon" : "text-dark-slate/60"}`}>{runNote.text}</p>}
          <a href="#mall" className="text-xs text-dark-slate/50 hover:text-dark-slate">{t("orManual")}</a>
        </div>
      )}

      {aiCount > 0 && (
        <div className="rounded-2xl border border-seagrass/30 bg-seagrass/5 p-4 text-sm text-dark-slate/75">
          <span className="font-semibold text-dark-slate">✨ {t("aiDoneHeading", { count: aiCount })}</span> {t("aiDoneBody")}
          {aiButton && (
            <button type="button" onClick={run} disabled={running} className="ml-2 text-xs font-medium text-seagrass hover:underline disabled:opacity-60">
              {running ? t("aiRunning") : t("aiMore")}
            </button>
          )}
          {runNote && <p className={`mt-1 text-xs ${runNote.error ? "text-watermelon" : "text-dark-slate/60"}`}>{runNote.text}</p>}
        </div>
      )}

      {/* What the scan starts from. */}
      <div className="rounded-2xl border border-dark-slate/10 bg-dry-sage/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-dark-slate/45">{t("startsFrom")}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {STRIP_FIELDS.map((key) => (
            <div key={key} className="rounded-xl bg-white px-3 py-2 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-slate/50">{label(key)}</p>
              {canvas[key]?.trim() ? (
                <p className="mt-0.5 line-clamp-2 text-dark-slate/80">{canvas[key]}</p>
              ) : (
                <p className="mt-0.5 text-[#B5524C]">{t("canvasEmpty")}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <ol id="mall" className="flex flex-col gap-4">
        {SECTIONS.map((sec, i) => (
          <li key={sec.type} className="rounded-2xl border border-dark-slate/10 bg-dry-sage/5 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dark-slate text-sm font-semibold text-white">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-dark-slate">{t(`section.${sec.type}.title`)}</p>
                <p className="text-sm text-dark-slate/65">{t(`section.${sec.type}.question`)}</p>
                <p className="mt-1 text-[11px] text-dark-slate/45">{t("buildsOn", { fields: sec.fields.map(label).join(" · ") })}</p>
              </div>
            </div>
            <ul className="mt-3 flex flex-col gap-3">
              {entries
                .filter((e) => e.type === sec.type)
                .map((e) => (
                  <EntryCard key={e.id} entry={e} canEdit={canEdit} linkedLabel={e.linkedField ? label(e.linkedField) : null} />
                ))}
            </ul>
            {canEdit && <AddEntry slug={slug} type={sec.type} fields={sec.fields.map((f) => ({ key: f, label: label(f) }))} />}
          </li>
        ))}
        {/* Keyed by the saved text, so a new AI draft (or a save) refills the form. */}
        <ConclusionCard key={JSON.stringify(conclusion)} slug={slug} canEdit={canEdit} conclusion={conclusion} n={SECTIONS.length + 1} />
      </ol>
    </div>
  );
}

function EntryCard({ entry, canEdit, linkedLabel }: { entry: ScanEntry; canEdit: boolean; linkedLabel: string | null }) {
  const t = useTranslations("MarketScanTemplate");
  const router = useRouter();
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });
  return (
    <li className="rounded-xl border border-dark-slate/10 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-dark-slate">{entry.name}</span>
        {entry.createdByAi && <span className="rounded-full border border-coral/40 bg-coral/10 px-1.5 py-px text-[10px] font-medium text-coral">{t("foundByAi")}</span>}
        {linkedLabel && <span className="rounded-full bg-dry-sage/30 px-2 py-0.5 text-[10px] text-dark-slate/60">{t("linkedTo", { field: linkedLabel })}</span>}
      </div>
      <p className="mt-1.5 text-sm text-dark-slate/80">{entry.description}</p>
      {entry.relevanceNote && (
        <p className="mt-1.5 text-sm text-dark-slate/80">
          <span className="font-medium text-dark-slate">{t("forYou")} </span>
          {entry.relevanceNote}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {entry.sourceUrl ? (
          <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-seagrass hover:underline">
            {t("source")}: {entry.sourceUrl}
          </a>
        ) : (
          <span />
        )}
        {canEdit && (
          <span className="flex gap-2 text-xs">
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => confirmMarketScanEntry(entry.id, !entry.confirmedAt))}
              className={`rounded-full border px-2.5 py-1 font-medium ${entry.confirmedAt ? "border-seagrass bg-seagrass/10 text-seagrass" : "border-seagrass/50 text-seagrass hover:bg-seagrass/10"}`}
            >
              {entry.confirmedAt ? t("confirmed") : t("confirm")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => deleteMarketScanEntry(entry.id))}
              className="rounded-full border border-dark-slate/15 px-2.5 py-1 text-dark-slate/60 hover:text-dark-slate"
            >
              {t("remove")}
            </button>
          </span>
        )}
      </div>
    </li>
  );
}

function AddEntry({ slug, type, fields }: { slug: string; type: string; fields: { key: string; label: string }[] }) {
  const t = useTranslations("MarketScanTemplate");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", sourceUrl: "", description: "", relevanceNote: "", linkedField: fields[0]?.key ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = "mt-1 w-full rounded-lg border border-dark-slate/20 bg-white px-3 py-2 text-sm focus:border-seagrass focus:outline-none";

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm font-medium text-seagrass hover:underline">
        {t("add")}
      </button>
    );
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await addMarketScanEntry(slug, { type, ...form });
      if (res && "error" in res && res.error) return setError(t("addError"));
      setForm({ name: "", sourceUrl: "", description: "", relevanceNote: "", linkedField: fields[0]?.key ?? "" });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 grid gap-3 rounded-xl border border-dark-slate/10 bg-white p-4 sm:grid-cols-2">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-dark-slate/50">
        {t("fieldName")}
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("fieldNameHint")} className={input} />
      </label>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-dark-slate/50">
        {t("fieldSource")}
        <input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder={t("fieldSourceHint")} className={input} />
      </label>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-dark-slate/50">
        {t("fieldWhat")}
        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("fieldWhatHint")} className={input} />
      </label>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-dark-slate/50">
        {t("fieldMeaning")}
        <textarea rows={2} value={form.relevanceNote} onChange={(e) => setForm({ ...form, relevanceNote: e.target.value })} placeholder={t("fieldMeaningHint")} className={input} />
      </label>
      {fields.length > 1 && (
        <label className="text-[11px] font-semibold uppercase tracking-wide text-dark-slate/50 sm:col-span-2">
          {t("fieldLinked")}
          <select value={form.linkedField} onChange={(e) => setForm({ ...form, linkedField: e.target.value })} className={input}>
            {fields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && <p className="text-xs text-watermelon sm:col-span-2">{error}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <button type="button" onClick={save} disabled={pending || !form.name.trim() || !form.description.trim()} className="rounded-full bg-seagrass px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
          {t("save")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-dark-slate/60 hover:text-dark-slate">
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}

function ConclusionCard({ slug, canEdit, conclusion, n }: { slug: string; canEdit: boolean; conclusion: Conclusion; n: number }) {
  const t = useTranslations("MarketScanTemplate");
  const router = useRouter();
  const initial = { strengths: conclusion?.strengths ?? "", gap: conclusion?.gap ?? "", firstContacts: conclusion?.firstContacts ?? "" };
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const dirty = form.strengths !== initial.strengths || form.gap !== initial.gap || form.firstContacts !== initial.firstContacts;
  const keys = ["strengths", "gap", "firstContacts"] as const;

  return (
    <li className="rounded-2xl border border-dark-slate/10 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral text-sm font-semibold text-white">{n}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-dark-slate">{t("conclusionTitle")}</p>
          <p className="text-sm text-dark-slate/65">{t("conclusionBody")}</p>
        </div>
        {conclusion?.createdByAi && !dirty && (
          <span className="shrink-0 rounded-full border border-[#E08A00]/50 bg-[#E08A00]/10 px-1.5 py-px text-[10px] font-medium text-[#9a5f00]">{t("aiDraft")}</span>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {keys.map((k) => (
          <label key={k} className="rounded-xl border border-dark-slate/10 bg-dry-sage/5 p-3 text-sm font-medium text-dark-slate">
            {t(`conclusion.${k}`)}
            {canEdit ? (
              <textarea
                rows={3}
                value={form[k]}
                onChange={(e) => { setForm({ ...form, [k]: e.target.value }); setSaved(false); }}
                placeholder={t("writeHere")}
                className="mt-1 w-full rounded-lg border border-dark-slate/15 bg-white px-3 py-2 text-sm font-normal text-dark-slate/85 focus:border-seagrass focus:outline-none"
              />
            ) : (
              <p className="mt-1 text-sm font-normal text-dark-slate/80">{form[k] || "—"}</p>
            )}
          </label>
        ))}
      </div>
      {canEdit && (dirty || saved) && (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={pending || !dirty}
            onClick={() => start(async () => { await saveMarketScanConclusion(slug, form); setSaved(true); router.refresh(); })}
            className="rounded-full bg-seagrass px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("save")}
          </button>
          {saved && !dirty && <span className="text-xs text-seagrass">{t("saved")}</span>}
        </div>
      )}
    </li>
  );
}
