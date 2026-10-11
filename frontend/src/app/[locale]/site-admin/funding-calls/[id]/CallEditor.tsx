"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Provenance } from "@/lib/fundingCalls/types";
import { acknowledgeChange, publishCall, saveCall, setCallStatus, suggestWithAi, type CallFields } from "../actions";

const input = "w-full rounded-lg border border-muted-teal/40 px-3 py-2 text-sm text-dark-slate focus:border-seagrass focus:outline-none";
const primary = "rounded-lg bg-seagrass px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60";
const secondary = "rounded-lg border border-muted-teal/40 px-4 py-2 text-sm text-dark-slate hover:border-seagrass disabled:opacity-60";

const APPLICANT_LABELS: Record<string, string> = {
  COMPANY: "Företag",
  NONPROFIT: "Ideell förening",
  UNIVERSITY: "Lärosäte",
  MUNICIPALITY: "Kommun eller region",
  PUBLIC_AGENCY: "Myndighet",
  CONSORTIUM: "Konsortium",
  INDIVIDUAL: "Privatperson",
  OTHER: "Annan",
};

export default function CallEditor({
  id, status, changed, aiAvailable, provenance, initial,
}: { id: string; status: string; changed: boolean; aiAvailable: boolean; provenance: Provenance; initial: CallFields }) {
  const router = useRouter();
  const [f, setF] = useState<CallFields>(initial);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > 5 * 1024 * 1024) return setError("Bilden är större än 5 MB");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("visibility", "public");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (!res.ok || !data.url) throw new Error();
      set("imageUrl", data.url);
    } catch {
      setError("Bilden kunde inte laddas upp");
    } finally {
      setUploading(false);
    }
  }
  const set = <K extends keyof CallFields>(k: K, v: CallFields[K]) => setF((x) => ({ ...x, [k]: v }));

  const act = (fn: () => Promise<{ error?: string; filled?: number }>, okNote?: (r: { filled?: number }) => string) =>
    start(async () => {
      setError(null);
      setNote(null);
      const res = await fn();
      if (res?.error) return setError(res.error);
      if (okNote) setNote(okNote(res));
      router.refresh();
    });

  const source = (k: string) =>
    provenance[k] ? (
      <p className="mt-1 text-xs text-dark-slate/50">
        Källa: ”{provenance[k].quote}”
        {provenance[k].url && (
          <a href={provenance[k].url!} target="_blank" rel="noopener noreferrer" className="ml-1 text-seagrass hover:underline">länk</a>
        )}
      </p>
    ) : null;
  const field = (label: string, k: keyof CallFields, el: React.ReactNode) => (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{label}</span>
      {el}
      {source(k)}
    </label>
  );
  const text = (k: keyof CallFields, placeholder = "") => (
    <input value={f[k] as string} onChange={(e) => set(k, e.target.value as never)} placeholder={placeholder} className={input} />
  );

  return (
    <div className="flex flex-col gap-5">
      {aiAvailable && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-seagrass/30 bg-seagrass/5 px-4 py-3">
          <p className="text-sm text-dark-slate/75">AI läser källans texter och fyller tomma fält, med ett citat som källa per fält. Kontrollera allt innan du publicerar.</p>
          <button type="button" disabled={pending || dirty} onClick={() => act(() => suggestWithAi(id), (r) => `AI fyllde ${r.filled ?? 0} fält.`)} className={primary}>
            ✨ Föreslå med AI
          </button>
        </div>
      )}

      {field("Titel", "title", text("title"))}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">Bild på kortet</span>
        {f.imageUrl ? (
          <img src={f.imageUrl} alt="" className="aspect-[16/9] w-full max-w-sm rounded-lg border border-muted-teal/30 object-cover" />
        ) : (
          <p className="text-xs text-dark-slate/50">Ingen bild än. Utan egen bild visar kortet en neutral bild med finansiärens namn.</p>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickImage} />
        <div className="flex gap-3">
          <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={`${secondary} self-start`}>
            {uploading ? "Laddar upp …" : f.imageUrl ? "Byt bild" : "Ladda upp bild"}
          </button>
          {f.imageUrl && <button type="button" onClick={() => set("imageUrl", "")} className="text-sm text-dark-slate/50 hover:text-watermelon">Ta bort</button>}
        </div>
      </div>
      {field("Sammanfattning (3–5 meningar, enkel svenska)", "summary", <textarea value={f.summary} onChange={(e) => set("summary", e.target.value)} rows={5} className={input} />)}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("Länk till finansiärens sida", "url", text("url", "https://"))}
        {field("Ansökningslänk", "applyUrl", text("applyUrl", "https://"))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field(
          "Deadline",
          "deadline",
          <input type="datetime-local" value={f.deadline} disabled={f.rolling} onChange={(e) => set("deadline", e.target.value)} className={input} />,
        )}
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-dark-slate/80">
          <input type="checkbox" checked={f.rolling} onChange={(e) => set("rolling", e.target.checked)} />
          Löpande ansökan, ingen deadline
        </label>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">Vem får söka</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(APPLICANT_LABELS).map(([k, v]) => {
            const on = f.applicantTypes.includes(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => set("applicantTypes", on ? f.applicantTypes.filter((x) => x !== k) : [...f.applicantTypes, k])}
                className={`rounded-full border px-3 py-1 text-xs ${on ? "border-seagrass bg-seagrass/10 font-semibold text-seagrass" : "border-muted-teal/40 text-dark-slate/60"}`}
              >
                {v}
              </button>
            );
          })}
        </div>
        {source("applicantTypes")}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {field("Minsta belopp (kr)", "amountMinSek", text("amountMinSek"))}
        {field("Högsta belopp (kr)", "amountMaxSek", text("amountMaxSek"))}
        {field("Total budget (kr)", "totalBudgetSek", text("totalBudgetSek"))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {field("Medfinansiering", "cofunding", text("cofunding", "t.ex. 50 % eller krävs ej"))}
        {field("Tidigaste projektstart", "projectStart", <input type="date" value={f.projectStart} onChange={(e) => set("projectStart", e.target.value)} className={input} />)}
        {field("Projekttid (månader)", "projectLengthMonths", text("projectLengthMonths"))}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">Globala mål</span>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 17 }, (_, i) => i + 1).map((g) => {
            const on = f.sdgGoals.includes(g);
            return (
              <button key={g} type="button" onClick={() => set("sdgGoals", on ? f.sdgGoals.filter((x) => x !== g) : [...f.sdgGoals, g])} className={`h-8 w-8 rounded-md border text-xs ${on ? "border-seagrass bg-seagrass text-white" : "border-muted-teal/40 text-dark-slate/60"}`}>
                {g}
              </button>
            );
          })}
        </div>
        {source("sdgGoals")}
      </div>
      {field("Ämnen (kommaseparerade)", "tags", text("tags"))}
      {field("Krav på ansökan (en per rad)", "requirements", <textarea value={f.requirements} onChange={(e) => set("requirements", e.target.value)} rows={4} placeholder={"Budget\nProjektplan\nCV för projektledaren"} className={input} />)}
      {field("Statsstödsregel", "stateAidRule", text("stateAidRule", "t.ex. stöd av mindre betydelse"))}

      <div className="sticky bottom-14 flex flex-wrap items-center gap-3 rounded-xl border border-muted-teal/30 bg-white px-4 py-3 shadow-sm">
        <button type="button" disabled={pending || !dirty} onClick={() => act(() => saveCall(id, f), () => "Sparat.")} className={primary}>
          Spara
        </button>
        {status !== "PUBLISHED" ? (
          <button type="button" disabled={pending || dirty} onClick={() => act(() => publishCall(id), () => "Publicerad.")} className={secondary}>
            Publicera
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => act(() => setCallStatus(id, "DRAFT"), () => "Avpublicerad.")} className={secondary}>
            Avpublicera
          </button>
        )}
        {changed && (
          <button type="button" disabled={pending || dirty} onClick={() => act(() => acknowledgeChange(id), () => "Markerad som kontrollerad.")} className={secondary}>
            Ändringen är kontrollerad
          </button>
        )}
        {status !== "CLOSED" && (
          <button type="button" disabled={pending} onClick={() => act(() => setCallStatus(id, "CLOSED"), () => "Stängd.")} className="text-sm text-dark-slate/50 hover:text-watermelon">
            Stäng
          </button>
        )}
        {dirty && <span className="text-xs text-dark-slate/50">Spara innan du publicerar.</span>}
        {note && <span className="text-xs text-seagrass">{note}</span>}
        {error && <span className="text-xs text-watermelon">{error}</span>}
      </div>
    </div>
  );
}
