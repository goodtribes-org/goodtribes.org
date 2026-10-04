"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// The dream the visitor gave in Drömguiden, read back from the guide's
// localStorage copy ("gt:dream-guide", saved before it sends them here).
// Shows them it's kept, so logging in feels like the next step of what they
// started, not a wall.
export default function SavedDream() {
  const t = useTranslations("Auth");
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("gt:dream-guide");
      const dream = raw ? (JSON.parse(raw) as { answers?: { dream?: unknown } }).answers?.dream : null;
      if (typeof dream === "string" && dream.trim()) setText(dream.trim());
    } catch {
      // no storage: just no quote
    }
  }, []);

  if (!text) return null;
  return (
    <figure className="mb-8 rounded-xl border border-seagrass/30 bg-seagrass/5 px-4 py-3">
      <figcaption className="text-xs font-semibold uppercase tracking-wide text-seagrass">{t("dreamSaved")}</figcaption>
      <blockquote className="mt-1 text-sm italic text-dark-slate/80 line-clamp-4">”{text}”</blockquote>
    </figure>
  );
}
