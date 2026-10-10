"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { earlierPhases, type ProjectPhaseValue } from "@/lib/projectPhase";
import { restartFromPhase } from "./actions";

// "Starta om från en tidigare fas" (#313), under the phase box in the
// project settings: for a team that starts over. Nothing is deleted; the
// reopened phases' gates take new decisions.
export default function RestartPhase({ slug, phase }: { slug: string; phase: ProjectPhaseValue }) {
  const t = useTranslations("RestartPhase");
  const tPhase = useTranslations("ProjectPhase");
  const router = useRouter();
  const options = earlierPhases(phase);
  const [to, setTo] = useState<ProjectPhaseValue | "">(options[0] ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (options.length === 0) return null;

  function submit() {
    if (!to) return;
    if (!confirm(t("confirm", { phase: tPhase(to) }))) return;
    setError(null);
    start(async () => {
      const res = await restartFromPhase(slug, to, note);
      if ("error" in res) setError(t(`error.${res.error}`));
      else router.push(`/projects/${slug}`);
    });
  }

  return (
    <details className="rounded-md border border-muted-teal/50 p-4 text-sm">
      <summary className="cursor-pointer font-medium text-dark-slate">{t("heading")}</summary>
      <p className="mt-2 text-dark-slate/70">{t("intro")}</p>
      <label className="mt-3 block font-medium text-dark-slate">
        {t("toLabel")}
        <select value={to} onChange={(e) => setTo(e.target.value as ProjectPhaseValue)} className="mt-1 block w-full rounded-md border border-muted-teal bg-white px-3 py-2">
          {options.map((p) => <option key={p} value={p}>{tPhase(p)}</option>)}
        </select>
      </label>
      <label className="mt-3 block font-medium text-dark-slate">
        {t("noteLabel")}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder={t("notePlaceholder")} className="mt-1 block w-full rounded-md border border-muted-teal px-3 py-2 font-normal" />
      </label>
      {error && <p className="mt-2 text-watermelon">{error}</p>}
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={submit} disabled={pending || note.trim().length < 10} className="rounded-md border border-dark-slate/30 px-4 py-2 font-medium text-dark-slate hover:border-dark-slate/60 disabled:opacity-50">
          {pending ? t("saving") : t("submit")}
        </button>
      </div>
    </details>
  );
}
