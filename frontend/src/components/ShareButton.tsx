"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export default function ShareButton({
  url,
  title,
  text,
  variant = "button",
}: {
  url: string;
  title: string;
  text?: string;
  // "header": a plain share icon sized like the site header's other icons.
  // "block": fills its container, sized like the project page's Gilla button.
  variant?: "icon" | "button" | "header" | "block";
}) {
  const t = useTranslations("ShareButton");
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

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const destinations = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
    { label: t("email"), href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` },
  ];

  return (
    <div className={variant === "block" ? "relative block w-full" : "relative inline-block"}>
      {variant === "header" ? (
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative p-1 text-dark-slate/60 hover:text-dark-slate transition-colors"
          title={t("shareTitle")}
          aria-label={t("shareTitle")}
          aria-expanded={open}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
            <circle cx="18" cy="5" r="2.5" />
            <circle cx="6" cy="12" r="2.5" />
            <circle cx="18" cy="19" r="2.5" />
            <path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
          </svg>
        </button>
      ) : variant === "icon" ? (
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-dark-slate/40 hover:text-coral transition-colors flex items-center gap-1"
          title={t("shareTitle")}
          aria-label={t("shareTitle")}
        >
          <span aria-hidden>⤴</span>
        </button>
      ) : variant === "block" ? (
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 border border-muted-teal/40 text-dark-slate/60 hover:text-coral hover:border-coral/40 transition-colors"
        >
          <span aria-hidden>⤴</span> {t("shareTitle")}
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          className="px-4 py-2 rounded border border-muted-teal/50 text-xs font-semibold text-dark-slate/70 hover:text-coral hover:border-coral transition-colors flex items-center gap-1.5"
        >
          <span aria-hidden>⤴</span> {t("shareTitle")}
        </button>
      )}

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 border border-muted-teal/40 rounded-lg p-4 bg-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-dark-slate">{t("shareTitle")}</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-dark-slate/40 hover:text-dark-slate text-lg leading-none"
              aria-label={t("closeAria")}
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
                {copied ? t("copied") : t("copy")}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {destinations.map((d) => (
                <a
                  key={d.label}
                  href={d.href}
                  target={d.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel={d.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                  className="text-center px-2 py-1.5 rounded border border-muted-teal/50 text-xs text-dark-slate/70 hover:text-coral hover:border-coral transition-colors"
                >
                  {d.label}
                </a>
              ))}
            </div>

            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                className="px-3 py-1.5 rounded border border-muted-teal/50 text-xs text-dark-slate/70 hover:text-coral hover:border-coral transition-colors"
              >
                {t("moreOptions")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
