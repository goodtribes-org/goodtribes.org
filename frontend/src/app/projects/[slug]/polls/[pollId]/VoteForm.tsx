"use client";

import { useState, useTransition } from "react";
import { castVote } from "../actions";

interface PollOption {
  id: string;
  label: string;
  description: string | null;
}

interface Props {
  pollId: string;
  projectSlug: string;
  pollType: string;
  options: PollOption[];
  existingVoteOptionIds: string[];
}

export default function VoteForm({
  pollId,
  projectSlug,
  pollType,
  options,
  existingVoteOptionIds,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // For yes_no and multiple: single selection (radio-style)
  const [selectedId, setSelectedId] = useState<string>(existingVoteOptionIds[0] ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!selectedId) {
      setError("Välj ett alternativ.");
      return;
    }

    const votes = [{ optionId: selectedId, weight: 1 }];

    startTransition(async () => {
      const result = await castVote(pollId, votes, projectSlug);
      if (result && "error" in result) {
        setError(result.error ?? "Något gick fel.");
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Radio options */}
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label
            key={opt.id}
            className={`flex items-start gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
              selectedId === opt.id
                ? "border-seagrass bg-seagrass/5"
                : "border-muted-teal hover:border-seagrass/60 bg-white"
            }`}
          >
            <input
              type="radio"
              name="vote_option"
              value={opt.id}
              checked={selectedId === opt.id}
              onChange={() => setSelectedId(opt.id)}
              className="mt-0.5 accent-coral shrink-0"
            />
            <div className="min-w-0">
              <span className="text-sm font-medium text-dark-slate">{opt.label}</span>
              {opt.description && (
                <p className="text-xs text-dark-slate/50 mt-0.5">{opt.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>

      {error && <p className="text-sm text-watermelon">{error}</p>}
      {success && (
        <p className="text-sm text-green-700 font-medium">Din röst har registrerats!</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending || !selectedId}
          className="bg-coral text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-60"
        >
          {isPending ? "Röstar…" : existingVoteOptionIds.length > 0 ? "Ändra röst" : "Rösta"}
        </button>
      </div>
    </form>
  );
}
