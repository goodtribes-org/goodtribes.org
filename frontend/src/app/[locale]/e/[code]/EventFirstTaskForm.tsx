"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { openEventFirstTask } from "./actions";
import { EVENT_PROGRESS } from "@/components/EventBar";

// Step 2 on the evening's page (#281): one first task in your dream, in a
// few taps. The full editor (choosing among sign-ups, a question) stays on
// the board; tonight it's first come, first served.
const TIMES = ["MIN15", "HOUR1", "HOURS2_4", "RECURRING"] as const;

export default function EventFirstTaskForm({ dreams }: { dreams: { id: string; title: string; published: boolean }[] }) {
  const t = useTranslations("Event");
  const tTask = useTranslations("FirstTasks");
  const router = useRouter();
  const [projectId, setProjectId] = useState(dreams[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [time, setTime] = useState<string | null>(null);
  const [place, setPlace] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dream = dreams.find((d) => d.id === projectId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await openEventFirstTask(projectId, title, { why, time, place: place.trim() || null, choose: false });
      if ("error" in r) return setError(t("formError"));
      window.dispatchEvent(new Event(EVENT_PROGRESS));
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
      {dreams.length > 1 && (
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-xl border border-[#E4E4DF] bg-white px-3 py-2 text-sm">
          {dreams.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      )}
      <label className="flex flex-col gap-1 text-sm font-semibold text-[#1B1F1D]">
        {t("taskTitleLabel")}
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder={t("taskTitlePlaceholder")} className="rounded-xl border border-[#E4E4DF] px-3 py-2 text-sm font-normal" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-[#1B1F1D]">
        {tTask("whyLabel")}
        <input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={500} placeholder={tTask("whyPlaceholder")} className="rounded-xl border border-[#E4E4DF] px-3 py-2 text-sm font-normal" />
      </label>
      <div className="flex flex-col gap-1 text-sm font-semibold text-[#1B1F1D]">
        {tTask("timeLabel")}
        <div className="flex flex-wrap gap-1.5 font-normal">
          {TIMES.map((x) => (
            <button key={x} type="button" onClick={() => setTime(time === x ? null : x)} className={`rounded-full border px-3 py-1.5 text-sm ${time === x ? "border-[#1B1F1D] bg-[#1B1F1D] text-white" : "border-[#E4E4DF] text-[#4A514D]"}`}>
              {tTask(`time_${x}`)}
            </button>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold text-[#1B1F1D]">
        {t("placeLabel")}
        <input value={place} onChange={(e) => setPlace(e.target.value)} maxLength={120} placeholder={t("placePlaceholder")} className="rounded-xl border border-[#E4E4DF] px-3 py-2 text-sm font-normal" />
      </label>
      {dream && !dream.published && <p className="rounded-xl bg-[#FFF4EE] p-3 text-xs text-[#9A3412]">{t("publishNote")}</p>}
      {error && <p className="text-sm text-[#C62828]">{error}</p>}
      <button type="submit" disabled={pending || !title.trim()} className="rounded-full bg-[#E8531F] px-4 py-3 font-bold text-white disabled:opacity-60">
        {pending ? t("opening") : t("openTask")}
      </button>
    </form>
  );
}
