"use client";

import { useState, useTransition } from "react";
import { logTime } from "../tokens/actions";

interface Props {
  cardId: string;
  projectSlug: string;
  estimatedHours?: number;
}

export default function LogTimeForm({ cardId, projectSlug, estimatedHours }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [hours, setHours] = useState<string>(
    estimatedHours != null ? String(estimatedHours) : "",
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCollapse() {
    setExpanded(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedHours = parseFloat(hours);
    if (!hours || isNaN(parsedHours) || parsedHours <= 0) {
      setError("Ange ett giltigt antal timmar.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await logTime(cardId, parsedHours, note, projectSlug);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setExpanded(false);
        setHours(estimatedHours != null ? String(estimatedHours) : "");
        setNote("");
      }
    });
  }

  if (success) {
    return (
      <p className="text-xs text-seagrass font-medium">
        Tid loggad — väntar på godkännande.
      </p>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-xs text-dark-slate/50 hover:text-seagrass transition-colors flex items-center gap-1"
        type="button"
      >
        <span aria-hidden="true">⏱</span> Logga tid
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-xs text-dark-slate/60 shrink-0">Timmar</label>
        <input
          type="number"
          min="0.25"
          step="0.25"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="w-24 border border-muted-teal rounded px-2 py-1 text-sm text-dark-slate focus:outline-none focus:border-seagrass"
          placeholder="0"
          required
        />
      </div>
      <div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Anteckning (valfritt)"
          className="w-full border border-muted-teal rounded px-2 py-1 text-sm text-dark-slate focus:outline-none focus:border-seagrass resize-none"
        />
      </div>
      {error && <p className="text-xs text-coral">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1 text-xs font-medium bg-seagrass text-white rounded hover:bg-seagrass/80 transition-colors disabled:opacity-50"
        >
          {isPending ? "Loggar..." : "Logga"}
        </button>
        <button
          type="button"
          onClick={handleCollapse}
          disabled={isPending}
          className="px-3 py-1 text-xs font-medium border border-muted-teal text-dark-slate/60 rounded hover:text-dark-slate hover:border-dark-slate/40 transition-colors"
        >
          Avbryt
        </button>
      </div>
    </form>
  );
}
