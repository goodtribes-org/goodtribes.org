export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { multiSearch, SearchResult } from "@/lib/meili";

export const metadata: Metadata = {
  title: "Search — GoodTribes.org",
};

const TYPE_LABEL: Record<SearchResult["type"], string> = {
  project: "Project",
  idea: "Idea",
  member: "Member",
};

const TYPE_COLOR: Record<SearchResult["type"], string> = {
  project: "bg-coral/10 text-coral border-coral/20",
  idea: "bg-seagrass/10 text-seagrass border-seagrass/20",
  member: "bg-dry-sage text-dark-slate border-muted-teal/40",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const results = query.length >= 2 ? await multiSearch(query) : [];

  const grouped: Record<SearchResult["type"], SearchResult[]> = {
    project: [],
    idea: [],
    member: [],
  };
  for (const r of results) grouped[r.type].push(r);

  const sections: { type: SearchResult["type"]; label: string; href: string }[] = [
    { type: "project", label: "Projects", href: "/projects" },
    { type: "idea", label: "Ideas", href: "/ideas" },
    { type: "member", label: "Members", href: "/members" },
  ];

  return (
    <div className="max-w-2xl">
      {/* Search bar */}
      <form method="get" action="/search" className="flex gap-2 mb-8">
        <input
          name="q"
          defaultValue={query}
          autoFocus
          placeholder="Search projects, ideas, members…"
          className="flex-1 border border-muted-teal/60 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-seagrass"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-coral text-white text-sm font-medium rounded-md hover:bg-watermelon transition-colors"
        >
          Search
        </button>
      </form>

      {!query ? (
        <div className="text-center py-16">
          <p className="text-dark-slate/40 text-sm">Type something to search.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-dark-slate/50 mb-2">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-dark-slate/30 text-sm">Try a different term, or browse below:</p>
          <div className="flex justify-center gap-4 mt-4">
            {sections.map((s) => (
              <Link key={s.type} href={s.href} className="text-coral hover:underline text-sm">
                {s.label} →
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-dark-slate/50">
            {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>

          {sections.map(({ type, label }) => {
            const items = grouped[type];
            if (items.length === 0) return null;
            return (
              <section key={type}>
                <h2 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">
                  {label}
                </h2>
                <div className="flex flex-col divide-y divide-muted-teal/30 border border-muted-teal/30 rounded-lg overflow-hidden">
                  {items.map((r) => (
                    <Link
                      key={r.id}
                      href={r.url}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-dry-sage/20 transition-colors"
                    >
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider border rounded px-1.5 py-0.5 mt-0.5 flex-shrink-0 ${TYPE_COLOR[r.type]}`}
                      >
                        {TYPE_LABEL[r.type]}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-dark-slate">{r.title}</p>
                        {r.description && (
                          <p className="text-xs text-dark-slate/50 mt-0.5 line-clamp-2">
                            {r.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
