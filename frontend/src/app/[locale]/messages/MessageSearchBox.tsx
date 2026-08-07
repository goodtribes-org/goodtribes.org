"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { searchRoomMessages } from "./actions";

type Hit = { id: string; roomId: string; body: string; authorName: string; createdAt: number };

type Props = {
  // Scopes to "search within this room" when set; omitted, searches every
  // room the current user belongs to (see searchRoomMessages/
  // getSearchableRoomIds).
  roomId?: string;
  placeholder?: string;
};

function snippet(body: string) {
  const plain = body.replace(/<[^>]*>/g, "").trim();
  return plain.length > 140 ? `${plain.slice(0, 140)}…` : plain;
}

export function MessageSearchBox({ roomId, placeholder }: Props) {
  const t = useTranslations("MessageSearchBox");
  const effectivePlaceholder = placeholder ?? t("searchPlaceholderDefault");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timeout = setTimeout(() => {
      searchRoomMessages(query, roomId)
        .then((hits) => {
          if (!cancelled) setResults(hits);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, roomId]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("searchAriaLabel")}
        title={t("searchAriaLabel")}
        className="p-1.5 text-dark-slate/50 hover:text-seagrass transition-colors"
      >
        🔍
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-80 bg-white border border-muted-teal/30 rounded-lg shadow-lg z-30 p-2">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={effectivePlaceholder}
            className="w-full px-2.5 py-1.5 border border-muted-teal/30 rounded-md text-sm focus:outline-none focus:border-seagrass"
          />
          <div className="mt-2 max-h-72 overflow-y-auto">
            {loading && <p className="text-xs text-dark-slate/40 px-1 py-2">{t("searching")}</p>}
            {!loading && query.trim().length >= 2 && results.length === 0 && (
              <p className="text-xs text-dark-slate/40 px-1 py-2">{t("noResults")}</p>
            )}
            {results.map((hit) => (
              <Link
                key={hit.id}
                href={`/messages/${hit.roomId}?m=${hit.id}`}
                onClick={() => setOpen(false)}
                className="block px-2 py-1.5 rounded-md hover:bg-dry-sage/20 text-sm"
              >
                <span className="font-semibold text-dark-slate">{hit.authorName}</span>{" "}
                <span className="text-dark-slate/60">{snippet(hit.body)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
