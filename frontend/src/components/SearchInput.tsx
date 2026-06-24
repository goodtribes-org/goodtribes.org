"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SearchResult {
  id: string;
  type: "project" | "idea" | "member";
  title: string;
  description?: string;
  url: string;
}

const TYPE_LABEL: Record<SearchResult["type"], string> = {
  project: "Project",
  idea: "Idea",
  member: "Member",
};

const TYPE_COLOR: Record<SearchResult["type"], string> = {
  project: "text-coral",
  idea: "text-seagrass",
  member: "text-dark-slate/40",
};

export default function SearchInput() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data: SearchResult[] = await res.json();
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && query.trim().length >= 2) {
            setOpen(false);
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
          }
        }}
        placeholder="type to search"
        className="border border-muted-teal/60 rounded-md px-3 py-1.5 text-sm text-dark-slate/70 bg-white focus:outline-none focus:ring-1 focus:ring-seagrass w-48"
      />

      {open && (
        <div className="absolute top-full mt-1 right-0 w-80 bg-white border border-muted-teal rounded-lg shadow-lg z-50 overflow-hidden">
          {loading ? (
            <p className="px-4 py-3 text-sm text-dark-slate/50">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-dark-slate/50">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={r.url}
                    onClick={close}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-dry-sage/30 transition-colors"
                  >
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 w-14 flex-shrink-0 ${TYPE_COLOR[r.type]}`}
                    >
                      {TYPE_LABEL[r.type]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark-slate truncate">
                        {r.title}
                      </p>
                      {r.description && (
                        <p className="text-xs text-dark-slate/50 truncate">
                          {r.description}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
