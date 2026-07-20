"use client";

import { useState, useTransition } from "react";
import { castImpactFundVote } from "./actions";

interface Candidate {
  optionId: string;
  label: string;
}

interface Props {
  pollId: string;
  candidates: Candidate[];
  gtBalance: number;
  existingVotes: { optionId: string; weight: number }[];
}

export default function ImpactFundVoteForm({ pollId, candidates, gtBalance, existingVotes }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initialWeights: Record<string, number> = {};
  for (const c of candidates) {
    initialWeights[c.optionId] = existingVotes.find((v) => v.optionId === c.optionId)?.weight ?? 0;
  }
  const [weights, setWeights] = useState<Record<string, number>>(initialWeights);

  const allocatedTotal = Object.values(weights).reduce((sum, w) => sum + (w || 0), 0);
  const remaining = gtBalance - allocatedTotal;

  function handleWeightChange(optionId: string, raw: string) {
    const val = Math.max(0, Math.min(gtBalance, parseFloat(raw) || 0));
    setWeights((prev) => ({ ...prev, [optionId]: val }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const allocations = candidates
      .map((c) => ({ optionId: c.optionId, weight: weights[c.optionId] ?? 0 }))
      .filter((a) => a.weight > 0);

    if (allocations.length === 0) {
      setError("Fördela minst ett GT på ett projekt.");
      return;
    }
    if (allocatedTotal > gtBalance) {
      setError(`Du kan maximalt använda ${gtBalance} GT.`);
      return;
    }

    startTransition(async () => {
      const result = await castImpactFundVote(pollId, allocations);
      if (result && "error" in result) setError(result.error ?? "Något gick fel.");
      else setSuccess(true);
    });
  }

  if (candidates.length === 0) {
    return <p className="text-sm text-dark-slate/40">Inga kandidatprojekt i denna omgång.</p>;
  }

  return (
    <div className="border border-muted-teal rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-dark-slate">Rösta om uppstartskapital</h2>
        <span className="text-xs text-dark-slate/50 bg-dark-slate/5 px-2 py-1 rounded-full">
          Du har <span className="font-semibold text-dark-slate/80">{gtBalance}</span> GT att rösta med
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {candidates.map((c) => (
            <div key={c.optionId} className="flex items-center gap-3 border border-muted-teal rounded-lg px-4 py-3 bg-white">
              <span className="flex-1 min-w-0 text-sm font-medium text-dark-slate">{c.label}</span>
              <input
                type="number"
                min={0}
                max={gtBalance}
                value={weights[c.optionId] ?? 0}
                onChange={(e) => handleWeightChange(c.optionId, e.target.value)}
                className="w-20 border border-muted-teal rounded-md px-2 py-1.5 text-sm text-center text-dark-slate focus:outline-none focus:ring-1 focus:ring-seagrass"
              />
            </div>
          ))}
          <div className={`flex items-center justify-between text-xs mt-1 px-1 ${allocatedTotal > gtBalance ? "text-watermelon font-semibold" : "text-dark-slate/50"}`}>
            <span>Fördelat: {allocatedTotal} / {gtBalance} GT</span>
            {remaining >= 0 && <span>{remaining} kvar</span>}
          </div>
        </div>

        {error && <p className="text-sm text-watermelon">{error}</p>}
        {success && <p className="text-sm text-green-700 font-medium">Din röst har registrerats!</p>}

        <button
          type="submit"
          disabled={isPending || allocatedTotal === 0 || allocatedTotal > gtBalance}
          className="self-start bg-coral text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-60"
        >
          {isPending ? "Röstar…" : existingVotes.length > 0 ? "Ändra röst" : "Rösta"}
        </button>
      </form>
    </div>
  );
}
