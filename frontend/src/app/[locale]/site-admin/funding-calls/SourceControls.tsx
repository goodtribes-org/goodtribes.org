"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SourceResult } from "@/lib/fundingCalls/import";
import { createManualCall, runImportNow, setSourceAdapter } from "./actions";

const input = "rounded-lg border border-muted-teal/40 px-3 py-1.5 text-sm text-dark-slate focus:border-seagrass focus:outline-none";

const ADAPTER_LABELS: Record<string, string> = {
  MANUAL: "Läggs in för hand",
  VINNOVA: "Vinnovas öppna data",
  GDP_FORMAS: "Formas (GDP-API)",
};

export function SourceAdapter({ sourceId, adapter }: { sourceId: string; adapter: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      value={adapter}
      disabled={pending}
      onChange={(e) => start(async () => { await setSourceAdapter(sourceId, e.target.value); router.refresh(); })}
      className={input}
    >
      {Object.entries(ADAPTER_LABELS).map(([k, v]) => (
        <option key={k} value={k}>{v}</option>
      ))}
    </select>
  );
}

// The daily import, by hand — useful until the scheduled job runs, and to
// try a source right after setting it up.
export function ImportNow() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [results, setResults] = useState<SourceResult[] | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { const res = await runImportNow(); setResults(res.results ?? []); router.refresh(); })}
        className="rounded-lg bg-seagrass px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Hämtar …" : "Hämta nu"}
      </button>
      {results && (
        <p className="text-xs text-dark-slate/60">
          {results.length === 0
            ? "Ingen källa har ett dataflöde valt."
            : results.map((r) => `${r.source}: ${r.error ? `fel (${r.error})` : r.skipped ?? `${r.created} nya, ${r.updated} ändrade`}`).join(" · ")}
        </p>
      )}
    </div>
  );
}

// A call added by hand, for sources without a feed (Arvsfonden).
export function NewManualCall({ sources }: { sources: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-seagrass hover:underline">
        + Lägg till en utlysning för hand
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={input}>
        {sources.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Utlysningens titel" className={`${input} min-w-0 flex-1`} />
      <button
        type="button"
        disabled={pending || !title.trim() || !sourceId}
        onClick={() => start(async () => { const res = await createManualCall({ sourceId, title }); if (res?.error) setError(res.error); })}
        className="rounded-lg bg-seagrass px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        Skapa
      </button>
      {error && <span className="text-xs text-watermelon">{error}</span>}
    </div>
  );
}
