"use client";

import { useRef, useState } from "react";

interface KudosButtonProps {
  toUserId: string;
  toUserName: string;
  projectId?: string;
}

export default function KudosButton({ toUserId, toUserName, projectId }: KudosButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleOpen() {
    setSent(false);
    setError(null);
    setMessage("");
    setOpen(true);
    // Focus textarea after render
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleClose() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId, projectId, message: message.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Något gick fel.");
        setLoading(false);
        return;
      }
      setSent(true);
      setMessage("");
      setLoading(false);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
      }, 2000);
    } catch {
      setError("Kunde inte skicka kudos. Försök igen.");
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-muted-teal text-dark-slate hover:bg-dry-sage/40 transition-colors"
      >
        <span aria-hidden="true">&#128079;</span>
        Ge kudos
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={handleClose}
          />

          {/* Popover */}
          <div className="absolute z-50 mt-2 left-0 w-72 bg-white border border-muted-teal rounded-xl shadow-lg p-4">
            {sent ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <span className="text-2xl" aria-hidden="true">&#127881;</span>
                <p className="text-sm font-semibold text-seagrass">Kudos skickat!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <p className="text-sm font-medium text-dark-slate">
                  Ge kudos till <span className="font-semibold">{toUserName}</span>
                </p>
                <div>
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={160}
                    rows={3}
                    placeholder="Skriv ett kort meddelande..."
                    className="w-full text-sm border border-muted-teal rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-seagrass/40 placeholder:text-dark-slate/30"
                    disabled={loading}
                  />
                  <p className="text-xs text-dark-slate/40 text-right mt-0.5">
                    {message.length}/160
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
                    disabled={loading || message.trim().length === 0}
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
