"use client";

import { useState } from "react";
import { getLeanCanvasHistory } from "./actions";
import type { LeanCanvasField } from "./fields";

type Version = {
  id: string;
  createdAt: Date;
  savedBy: { name: string | null } | null;
} & Record<LeanCanvasField, string | null>;

const FIELD_LABELS: Record<LeanCanvasField, string> = {
  problem: "Problem",
  alternatives: "Alternativ",
  customerSegments: "Kundsegment",
  earlyAdopters: "Tidiga användare",
  uniqueValueProposition: "Unikt värdeerbjudande",
  concept: "Koncept",
  solution: "Lösning",
  channels: "Kanaler",
  revenueStreams: "Intäktsströmmar",
  costStructure: "Kostnadsstruktur",
  impact: "Impact",
  keyMetrics: "Nyckeltal",
  unfairAdvantage: "Orättvis fördel",
};

function formatDate(d: Date) {
  return new Date(d).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" });
}

export default function LeanCanvasHistory({ projectSlug }: { projectSlug: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [selected, setSelected] = useState<Version | null>(null);

  async function handleOpen() {
    setOpen(true);
    setSelected(null);
    if (versions) return;
    setLoading(true);
    const data = await getLeanCanvasHistory(projectSlug);
    setVersions(data as Version[]);
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1 text-xs font-medium text-dark-slate/50 hover:text-coral transition-colors"
      >
        Historik
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {!selected ? (
              <>
                <h2 className="text-lg font-bold text-dark-slate mb-4">Versionshistorik</h2>
                {loading && <p className="text-sm text-dark-slate/50">Laddar…</p>}
                {versions && versions.length === 0 && (
                  <p className="text-sm text-dark-slate/40 italic">Inga sparade versioner ännu.</p>
                )}
                {versions && versions.length > 0 && (
                  <ul className="space-y-1.5">
                    {versions.map((v) => (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(v)}
                          className="w-full text-left flex items-center justify-between gap-3 border border-dark-slate/10 rounded-lg px-3 py-2 hover:border-seagrass transition-colors"
                        >
                          <span className="text-sm text-dark-slate">{formatDate(v.createdAt)}</span>
                          <span className="text-xs text-dark-slate/50">{v.savedBy?.name ?? "Okänd"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex justify-end mt-4">
                  <button type="button" onClick={() => setOpen(false)} className="text-sm text-dark-slate/50 hover:text-dark-slate transition-colors">
                    Stäng
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-dark-slate">
                    Version från {formatDate(selected.createdAt)}
                  </h2>
                  <button type="button" onClick={() => setSelected(null)} className="text-sm text-seagrass hover:underline">
                    ← Tillbaka
                  </button>
                </div>
                <p className="text-xs text-dark-slate/50 mb-4">Sparad av {selected.savedBy?.name ?? "Okänd"} — skrivskyddad</p>
                <div className="space-y-3">
                  {(Object.keys(FIELD_LABELS) as LeanCanvasField[]).map((field) => (
                    <div key={field}>
                      <h3 className="text-xs font-bold text-dark-slate uppercase tracking-wide">{FIELD_LABELS[field]}</h3>
                      <p className="text-sm text-dark-slate/80 whitespace-pre-wrap mt-0.5">
                        {selected[field] || <span className="text-dark-slate/30 italic">Tomt</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
