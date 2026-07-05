"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SearchResult {
  id: string;
  type: "project" | "idea" | "org" | "member";
  title: string;
  description?: string;
  url: string;
}

const TYPE_LABEL: Record<SearchResult["type"], string> = {
  project: "Project",
  idea: "Idea",
  org: "Org",
  member: "Member",
};

const TYPE_COLOR: Record<SearchResult["type"], string> = {
  project: "text-coral",
  idea: "text-seagrass",
  org: "text-dark-slate/60",
  member: "text-dark-slate/40",
};

export default function SearchButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(""); setResults([]); }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data: SearchResult[] = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function close() { setOpen(false); }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1 text-dark-slate/60 hover:text-dark-slate transition-colors"
        aria-label="Sök"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-muted-teal/30 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-muted-teal/20">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
                if (e.key === "Enter" && query.trim().length >= 2) {
                  close();
                  router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                }
              }}
              placeholder="Sök…"
              className="w-full text-sm text-dark-slate/70 bg-transparent outline-none placeholder-dark-slate/30"
            />
          </div>

          {query.length >= 2 && (
            loading ? (
              <p className="px-4 py-3 text-sm text-dark-slate/50">Söker…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-dark-slate/50">Inga resultat för &ldquo;{query}&rdquo;</p>
            ) : (
              <ul>
                {results.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={r.url}
                      onClick={close}
                      className="flex items-start gap-3 px-4 py-2.5 hover:bg-dry-sage/30 transition-colors"
                    >
                      <span className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 w-14 flex-shrink-0 ${TYPE_COLOR[r.type]}`}>
                        {TYPE_LABEL[r.type]}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-dark-slate truncate">{r.title}</p>
                        {r.description && (
                          <p className="text-xs text-dark-slate/50 truncate">{r.description}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      )}
    </div>
  );
}
