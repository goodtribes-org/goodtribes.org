"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Decision = "approved" | "revision" | "rejected";

interface AIReviewActionsProps {
  aiTaskRunId: string;
}

export default function AIReviewActions({ aiTaskRunId }: AIReviewActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<Decision | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: Decision, feedbackText?: string) {
    setPending(decision);
    setError(null);
    try {
      const res = await fetch("/api/ai-agent/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiTaskRunId, decision, feedback: feedbackText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Något gick fel.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Nätverksfel. Försök igen.");
    } finally {
      setPending(null);
    }
  }

  function handleRevisionSubmit() {
    if (!feedback.trim()) return;
    setShowFeedback(false);
    submit("revision", feedback.trim());
    setFeedback("");
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}

      {showFeedback ? (
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full border border-muted-teal/50 rounded p-2 text-sm text-dark-slate placeholder-dark-slate/40 focus:outline-none focus:border-muted-teal resize-none"
            rows={3}
            placeholder="Beskriv vad som behöver revideras..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleRevisionSubmit}
              disabled={!feedback.trim() || pending === "revision"}
              className="px-4 py-1.5 rounded bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {pending === "revision" ? "Skickar..." : "Skicka revidering"}
            </button>
            <button
              onClick={() => { setShowFeedback(false); setFeedback(""); }}
              className="px-4 py-1.5 rounded border border-muted-teal/40 text-dark-slate/60 text-sm hover:text-dark-slate transition-colors"
            >
              Avbryt
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => submit("approved")}
            disabled={pending !== null}
            className="px-4 py-1.5 rounded bg-seagrass text-white text-sm font-medium hover:bg-seagrass/80 disabled:opacity-50 transition-colors"
          >
            {pending === "approved" ? "Godkänner..." : "Godkänn"}
          </button>
          <button
            onClick={() => setShowFeedback(true)}
            disabled={pending !== null}
            className="px-4 py-1.5 rounded bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            Begär revidering
          </button>
          <button
            onClick={() => submit("rejected")}
            disabled={pending !== null}
            className="px-4 py-1.5 rounded bg-coral text-white text-sm font-medium hover:bg-watermelon disabled:opacity-50 transition-colors"
          >
            {pending === "rejected" ? "Avvisar..." : "Avvisa"}
          </button>
        </div>
      )}
    </div>
  );
}
