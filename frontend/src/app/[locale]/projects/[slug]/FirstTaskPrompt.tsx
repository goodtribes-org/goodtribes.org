"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { FirstTaskSuggestion } from "@/lib/firstTaskSuggest";
import { createFirstTask, suggestFirstTasksAction } from "./first-task-actions";

// For a project's leads until it has an open first task (#284): "Vad är en
// sak någon annan kan hjälpa dig med den här veckan?" — AI suggests three
// (always a draft to pick from), or the lead writes one. Opening one makes it
// a first task on the board and on the project page.
const TIMES = ["MIN15", "HOUR1", "HOURS2_4", "RECURRING"] as const;

export default function FirstTaskPrompt({ projectId, slug, published, aiAvailable }: { projectId: string; slug: string; published: boolean; aiAvailable: boolean }) {
  const t = useTranslations("FirstTasks");
  const [opened, setOpened] = useState<{ cardId: string; title: string }[]>([]);
  const [openError, setOpenError] = useState(false);
  const [suggestions, setSuggestions] = useState<FirstTaskSuggestion[] | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [time, setTime] = useState<string | null>(null);
  const [choose, setChoose] = useState(false);
  const [question, setQuestion] = useState("");
  const [writing, setWriting] = useState(false);
  const [suggesting, startSuggest] = useTransition();
  const [opening, startOpen] = useTransition();

  function suggest() {
    setAiError(null);
    startSuggest(async () => {
      const r = await suggestFirstTasksAction(projectId);
      if (!r.ok) return setAiError(t(`suggestError_${r.reason}`));
      if (r.suggestions.length === 0) return setAiError(t("suggestError_failed"));
      setSuggestions(r.suggestions);
    });
  }
  function open(fields: { title: string; why: string; time: string | null; choose: boolean; question: string | null }) {
    setOpenError(false);
    startOpen(async () => {
      const r = await createFirstTask(projectId, fields.title, { why: fields.why, time: fields.time, choose: fields.choose, question: fields.question });
      if (!("ok" in r)) return setOpenError(true);
      setOpened((v) => [...v, { cardId: r.cardId, title: fields.title }]);
      setSuggestions((v) => v?.filter((s) => s.title !== fields.title) ?? null);
      setWriting(false); setTitle(""); setWhy(""); setTime(null); setChoose(false); setQuestion("");
    });
  }
  function edit(s: FirstTaskSuggestion) {
    setTitle(s.title); setWhy(s.why); setTime(s.time); setChoose(s.choose); setQuestion(s.question ?? ""); setWriting(true);
  }

  return (
    <section className="rounded-xl border border-seagrass/30 bg-seagrass/5 p-5">
      <h2 className="text-base font-semibold text-dark-slate">{t("promptHeading")}</h2>
      <p className="mt-1 text-sm text-dark-slate/70">{t("promptIntro")}</p>
      {!published && <p className="mt-2 text-xs text-dark-slate/60">{t("promptDraftNote")}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {aiAvailable && (
          <button type="button" onClick={suggest} disabled={suggesting} className="inline-flex items-center gap-1.5 rounded-full bg-seagrass px-4 py-2 text-sm font-semibold text-white hover:bg-seagrass/90 disabled:opacity-60">
            <span aria-hidden>✨</span> {suggesting ? t("suggesting") : suggestions ? t("suggestAgain") : t("suggest")}
          </button>
        )}
        <button type="button" onClick={() => setWriting((v) => !v)} className="rounded-full border border-seagrass/40 px-4 py-2 text-sm font-semibold text-seagrass hover:bg-white">
          {t("writeOwn")}
        </button>
      </div>
      {aiError && <p className="mt-2 text-sm text-watermelon">{aiError}</p>}
      {openError && <p className="mt-2 text-sm text-watermelon">{t("error")}</p>}

      {opened.length > 0 && (
        <div className="mt-3 rounded-lg border border-seagrass/40 bg-white p-3">
          <p className="text-sm font-semibold text-seagrass">{t("openedHeading", { count: opened.length })}</p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {opened.map((o) => (
              <li key={o.cardId}>
                ✓ <Link href={`/projects/${slug}/tasks?card=${o.cardId}`} className="text-dark-slate underline-offset-2 hover:underline">{o.title}</Link>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-dark-slate/60">{published ? t("openedNote") : t("promptDraftNote")}</p>
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {suggestions.map((s) => (
            <li key={s.title} className="rounded-lg border border-muted-teal/30 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-seagrass">{t("aiDraft")}</p>
              <p className="mt-0.5 font-semibold text-dark-slate">{s.title}</p>
              <p className="text-sm text-dark-slate/70">{s.why}</p>
              <p className="mt-1 text-[11px] text-dark-slate/50">
                {s.time && <>⏱ {t(`time_${s.time}`)} · </>}{s.choose ? t("whoChoose") : t("whoAnyone")}{s.source && <> · {t("basedOn", { source: s.source })}</>}
              </p>
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={opening} onClick={() => open(s)} className="rounded-full bg-coral px-3 py-1 text-xs font-bold text-white hover:bg-coral/90 disabled:opacity-50">{t("openThis")}</button>
                <button type="button" onClick={() => edit(s)} className="rounded-full border border-muted-teal/40 px-3 py-1 text-xs text-dark-slate/70">{t("editThis")}</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {writing && (
        <form
          onSubmit={(e) => { e.preventDefault(); open({ title, why, time, choose, question: choose ? question : null }); }}
          className="mt-3 space-y-2 rounded-lg border border-muted-teal/30 bg-white p-3 text-sm"
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder={t("titlePlaceholder")} className="w-full rounded-md border border-gray-200 px-2 py-1.5" />
          <input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={500} placeholder={t("whyPlaceholder")} className="w-full rounded-md border border-gray-200 px-2 py-1.5" />
          <div className="flex flex-wrap gap-1.5">
            {TIMES.map((x) => (
              <button key={x} type="button" onClick={() => setTime(time === x ? null : x)} className={`rounded-full border px-2.5 py-1 text-xs ${time === x ? "border-dark-slate bg-dark-slate text-white" : "border-gray-200 text-gray-600"}`}>{t(`time_${x}`)}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-dark-slate/70">
            <input type="checkbox" checked={choose} onChange={(e) => setChoose(e.target.checked)} className="accent-seagrass" /> {t("whoChoose")}
          </label>
          {choose && <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} placeholder={t("questionEditLabel")} className="w-full rounded-md border border-gray-200 px-2 py-1.5" />}
          <button type="submit" disabled={opening || !title.trim()} className="rounded-full bg-coral px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50">{t("openThis")}</button>
        </form>
      )}
    </section>
  );
}
