"use client";

import { useState, useTransition } from "react";
import { castVote } from "../actions";

interface PollOption {
  id: string;
  label: string;
  description: string | null;
}

interface ExistingVote {
  optionId: string;
  weight: number;
}

interface Props {
  pollId: string;
  projectSlug: string;
  pollType: string;
  options: PollOption[];
  userTotalTokens: number;
  existingVotes: ExistingVote[];
}

export default function VotingForm({
  pollId,
  projectSlug,
  pollType,
  options,
  userTotalTokens,
  existingVotes,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // --- yes_no state ---
  const initialYesNoId = existingVotes[0]?.optionId ?? "";
  const [selectedId, setSelectedId] = useState<string>(initialYesNoId);

  // --- multiple type state ---
  const initialWeights: Record<string, number> = {};
  for (const opt of options) {
    const ev = existingVotes.find((v) => v.optionId === opt.id);
    initialWeights[opt.id] = ev?.weight ?? 0;
  }
  const [weights, setWeights] = useState<Record<string, number>>(initialWeights);

  const allocatedTotal = Object.values(weights).reduce((sum, w) => sum + (w || 0), 0);
  const remaining = userTotalTokens - allocatedTotal;

  function handleWeightChange(optId: string, raw: string) {
    const val = Math.max(0, Math.min(userTotalTokens, parseInt(raw, 10) || 0));
    setWeights((prev) => ({ ...prev, [optId]: val }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    let votes: { optionId: string; weight: number }[] = [];

    if (pollType === "yes_no") {
      if (!selectedId) {
        setError("Välj ett alternativ.");
        return;
      }
      votes = [{ optionId: selectedId, weight: userTotalTokens }];
    } else {
      // multiple
      votes = options
        .map((o) => ({ optionId: o.id, weight: weights[o.id] ?? 0 }))
        .filter((v) => v.weight > 0);

      if (votes.length === 0) {
        setError("Fördela minst en token.");
        return;
      }
      if (allocatedTotal > userTotalTokens) {
        setError(`Du kan maximalt använda ${userTotalTokens} tokens.`);
        return;
      }
    }

    startTransition(async () => {
      const result = await castVote(pollId, votes, projectSlug);
      if (result && "error" in result) {
        setError(result.error ?? "Något gick fel.");
      } else {
        setSuccess(true);
      }
    });
  }

  const hasExistingVotes = existingVotes.length > 0;

  return (
    <div className="border border-muted-teal rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-dark-slate">
          {hasExistingVotes ? "Ändra din röst" : "Rösta"}
        </h2>
        <span className="text-xs text-dark-slate/50 bg-dark-slate/5 px-2 py-1 rounded-full">
          Du har <span className="font-semibold text-dark-slate/80">{userTotalTokens}</span> tokens att rösta med
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {pollType === "yes_no" ? (
          /* --- Big Ja/Nej buttons --- */
          <div className="grid grid-cols-2 gap-3">
            {options.map((opt) => {
              const isJa = opt.label.toLowerCase() === "ja";
              const isSelected = selectedId === opt.id;
              const icon = isJa ? "✅" : "❌";

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { setSelectedId(opt.id); setSuccess(false); }}
                  className={`flex flex-col items-center gap-2 py-5 rounded-xl border-2 text-base font-semibold transition-all ${
                    isSelected
                      ? isJa
                        ? "border-green-500 bg-green-50 text-green-800"
                        : "border-watermelon bg-watermelon/10 text-watermelon"
                      : "border-muted-teal bg-white text-dark-slate/70 hover:border-seagrass/60"
                  }`}
                >
                  <span className="text-2xl">{icon}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          /* --- Multiple: number inputs per option --- */
          <div className="flex flex-col gap-2">
            {options.map((opt) => (
              <div
                key={opt.id}
                className="flex items-center gap-3 border border-muted-teal rounded-lg px-4 py-3 bg-white"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-dark-slate">{opt.label}</span>
                  {opt.description && (
                    <p className="text-xs text-dark-slate/50 mt-0.5">{opt.description}</p>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  max={userTotalTokens}
                  value={weights[opt.id] ?? 0}
                  onChange={(e) => handleWeightChange(opt.id, e.target.value)}
                  className="w-20 border border-muted-teal rounded-md px-2 py-1.5 text-sm text-center text-dark-slate focus:outline-none focus:ring-1 focus:ring-seagrass"
                />
              </div>
            ))}

            {/* Running total */}
            <div className={`flex items-center justify-between text-xs mt-1 px-1 ${allocatedTotal > userTotalTokens ? "text-watermelon font-semibold" : "text-dark-slate/50"}`}>
              <span>Fördelade: {allocatedTotal} / {userTotalTokens} tokens</span>
              {remaining >= 0 && (
                <span>{remaining} kvar</span>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-watermelon">{error}</p>}
        {success && (
          <p className="text-sm text-green-700 font-medium">Din röst har registrerats!</p>
        )}

        <button
          type="submit"
          disabled={
            isPending ||
            (pollType === "yes_no" && !selectedId) ||
            (pollType !== "yes_no" && (allocatedTotal === 0 || allocatedTotal > userTotalTokens))
          }
          className="self-start bg-coral text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-60"
        >
          {isPending ? "Röstar…" : hasExistingVotes ? "Ändra röst" : "Rösta"}
        </button>
      </form>
    </div>
  );
}
