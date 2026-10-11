"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmIdentity, decide } from "./actions";

const input = "w-full rounded-lg border border-muted-teal/40 px-3 py-2 text-sm text-dark-slate focus:border-seagrass focus:outline-none";

export default function ReviewControls({ applicationId, identityDone }: { applicationId: string; identityDone: boolean }) {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [motivation, setMotivation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  return (
    <div className="flex flex-col gap-3 border-t border-muted-teal/20 pt-3">
      {!identityDone ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-dark-slate">2. Identitet och roller</p>
          <p className="text-xs text-dark-slate/55">Utan BankID: bekräfta själv vilka projektledaren och nyckelpersonerna är och vilka roller de har, och skriv hur.</p>
          <textarea value={identity} onChange={(e) => setIdentity(e.target.value)} rows={2} placeholder="T.ex. videosamtal med projektledaren 14/10, legitimation visad; roller enligt teamlistan" className={input} />
          <button type="button" disabled={pending || !identity.trim()} onClick={() => act(() => confirmIdentity(applicationId, identity))} className="self-start rounded-lg border border-seagrass px-3 py-1.5 text-xs font-semibold text-seagrass hover:bg-seagrass/10 disabled:opacity-50">
            Identitet och roller är bekräftade
          </button>
        </div>
      ) : (
        <p className="text-sm text-seagrass">✓ 2. Identitet och roller bekräftade</p>
      )}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-dark-slate">3. Beslut</p>
        <p className="text-xs text-dark-slate/55">Rätt personer? Har teamet kapacitet? Jäv? Ligger projektet inom enhetens ändamål?</p>
        <textarea value={motivation} onChange={(e) => setMotivation(e.target.value)} rows={3} placeholder="Motivering (krävs)" className={input} />
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending || !motivation.trim() || !identityDone} onClick={() => act(() => decide(applicationId, "OK", motivation))} className="rounded-lg bg-seagrass px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            Godkänn
          </button>
          <button type="button" disabled={pending || !motivation.trim()} onClick={() => act(() => decide(applicationId, "CHANGES", motivation))} className="rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50">
            Begär ändringar
          </button>
          <button type="button" disabled={pending || !motivation.trim()} onClick={() => act(() => decide(applicationId, "REJECTED", motivation))} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-watermelon disabled:opacity-50">
            Avslå
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-watermelon">{error}</p>}
    </div>
  );
}
