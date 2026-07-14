"use client";

import { useRef, useState } from "react";

interface OrgReviewButtonProps {
  organisationId: string;
  orgName: string;
}

export default function OrgReviewButton({ organisationId, orgName }: OrgReviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleOpen() {
    setSent(false);
    setError(null);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/org-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId, rating, comment: comment.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Något gick fel.");
        setLoading(false);
        return;
      }
      setSent(true);
      setLoading(false);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        // reload to reflect the updated aggregate
        window.location.reload();
      }, 1200);
    } catch {
      setError("Kunde inte skicka recensionen. Försök igen.");
      setLoading(false);
    }
  }

  const displayRating = hoverRating ?? rating;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-muted-teal text-dark-slate hover:bg-dry-sage/40 transition-colors"
      >
        <span aria-hidden="true">★</span>
        Lämna recension
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={handleClose} />

          <div className="absolute z-50 mt-2 left-0 w-72 bg-white border border-muted-teal rounded-xl shadow-lg p-4">
            {sent ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <span className="text-2xl" aria-hidden="true">🎉</span>
                <p className="text-sm font-semibold text-seagrass">Recension skickad!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <p className="text-sm font-medium text-dark-slate">
                  Recensera <span className="font-semibold">{orgName}</span>
                </p>
                <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(null)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      className="text-2xl leading-none focus:outline-none"
                      aria-label={`${n} av 5 stjärnor`}
                    >
                      <span className={n <= displayRating ? "text-amber-400" : "text-muted-teal/40"}>★</span>
                    </button>
                  ))}
                </div>
                <div>
                  <textarea
                    ref={textareaRef}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Valfri kommentar..."
                    className="w-full text-sm border border-muted-teal rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-seagrass/40 placeholder:text-dark-slate/30"
                    disabled={loading}
                  />
                  <p className="text-xs text-dark-slate/40 text-right mt-0.5">
                    {comment.length}/500
                  </p>
                </div>
                {error && (
                  <p className="text-xs text-coral font-medium">{error}</p>
                )}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-sm text-dark-slate/50 hover:text-dark-slate transition-colors"
                    disabled={loading}
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="text-sm font-medium bg-seagrass text-white px-3 py-1.5 rounded-md hover:bg-seagrass/80 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Skickar..." : "Skicka"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
