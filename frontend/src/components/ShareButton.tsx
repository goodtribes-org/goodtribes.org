"use client";

import { useEffect, useState } from "react";

export default function ShareButton({
  url,
  title,
  text,
  variant = "button",
}: {
  url: string;
  title: string;
  text?: string;
  variant?: "icon" | "button";
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the read-only input below is the fallback
    }
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // user cancelled — nothing to do
    }
  }

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const xUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  return (
    <div className="relative inline-block">
      {variant === "icon" ? (
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-dark-slate/40 hover:text-coral transition-colors flex items-center gap-1"
          title="Dela"
          aria-label="Dela"
        >
          <span aria-hidden>⤴</span>
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          className="px-4 py-2 rounded border border-muted-teal/50 text-xs font-semibold text-dark-slate/70 hover:text-coral hover:border-coral transition-colors flex items-center gap-1.5"
        >
          <span aria-hidden>⤴</span> Dela
        </button>
      )}

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 border border-muted-teal/40 rounded-lg p-4 bg-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-dark-slate">Dela</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-dark-slate/40 hover:text-dark-slate text-lg leading-none"
              aria-label="Stäng"
            >
              ×
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 border border-muted-teal/50 rounded px-2 py-1.5 text-xs text-dark-slate/70 focus:outline-none focus:border-coral"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded bg-coral text-white text-xs font-semibold hover:bg-watermelon transition-colors whitespace-nowrap"
              >
                {copied ? "Kopierad!" : "Kopiera"}
              </button>
            </div>

            <div className="flex gap-2">
              <a
                href={linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center px-3 py-1.5 rounded border border-muted-teal/50 text-xs text-dark-slate/70 hover:text-coral hover:border-coral transition-colors"
              >
                LinkedIn
              </a>
              <a
                href={xUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center px-3 py-1.5 rounded border border-muted-teal/50 text-xs text-dark-slate/70 hover:text-coral hover:border-coral transition-colors"
              >
                X
              </a>
            </div>

            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                className="px-3 py-1.5 rounded border border-muted-teal/50 text-xs text-dark-slate/70 hover:text-coral hover:border-coral transition-colors"
              >
                Fler alternativ…
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
