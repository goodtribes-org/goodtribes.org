"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveEntity, type EntityInput } from "./actions";
import { KIND_LABELS, STATUS_LABELS } from "@/lib/fundingCalls/review";

const input = "w-full rounded-lg border border-muted-teal/40 px-3 py-2 text-sm text-dark-slate focus:border-seagrass focus:outline-none";
const APPLICANT_LABELS: Record<string, string> = {
  COMPANY: "Företag", NONPROFIT: "Ideell förening", UNIVERSITY: "Lärosäte", MUNICIPALITY: "Kommun eller region",
  PUBLIC_AGENCY: "Myndighet", CONSORTIUM: "Konsortium", INDIVIDUAL: "Privatperson", OTHER: "Annan",
};

export default function EntityEditor({ id, initial, onDone }: { id: string | null; initial: EntityInput; onDone?: () => void }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof EntityInput>(k: K, v: EntityInput[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Namn" className={input} />
        <input value={f.orgNumber} onChange={(e) => set("orgNumber", e.target.value)} placeholder="Organisationsnummer" className={input} />
        <select value={f.kind} onChange={(e) => set("kind", e.target.value)} className={input}>
          {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={f.status} onChange={(e) => set("status", e.target.value)} className={input}>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">Kan söka som</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(APPLICANT_LABELS).map(([k, v]) => {
            const on = f.applicantTypes.includes(k);
            return (
              <button key={k} type="button" onClick={() => set("applicantTypes", on ? f.applicantTypes.filter((x) => x !== k) : [...f.applicantTypes, k])} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-seagrass bg-seagrass/10 font-semibold text-seagrass" : "border-muted-teal/40 text-dark-slate/60"}`}>
                {v}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={f.signatoryName} onChange={(e) => set("signatoryName", e.target.value)} placeholder="Firmatecknare" className={input} />
        <input value={f.signatoryEmail} onChange={(e) => set("signatoryEmail", e.target.value)} placeholder="Firmatecknarens e-post" className={input} />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">Granskare (e-post, kommaseparerade — tomt = alla site-admins)</span>
        <input value={f.reviewerEmails} onChange={(e) => set("reviewerEmails", e.target.value)} className={input} />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { const res = await saveEntity(id, f); if (res.error) setError(res.error); else { setError(null); onDone?.(); router.refresh(); } })}
          className="rounded-lg bg-seagrass px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          Spara
        </button>
        {error && <span className="text-xs text-watermelon">{error}</span>}
      </div>
    </div>
  );
}

export function NewEntity() {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-seagrass hover:underline">+ Ny enhet</button>;
  return (
    <div className="rounded-xl border border-muted-teal/30 bg-white p-4">
      <EntityEditor id={null} onDone={() => setOpen(false)} initial={{ name: "", orgNumber: "", kind: "LIMITED_COMPANY", status: "PLANNED", applicantTypes: [], signatoryName: "", signatoryEmail: "", reviewerEmails: "" }} />
    </div>
  );
}
