"use client";

const SORT_OPTIONS = [
  { value: "new",      label: "Nya" },
  { value: "top",      label: "Topp" },
  { value: "trending", label: "Trendar" },
];

interface Props {
  sort: string;
  q?: string;
  status?: string;
  category?: string;
  sdg?: string;
  basePath?: string;
  /** Called with the built URL instead of navigating directly, so this component has no router/Link dependency. */
  onNavigate: (url: string) => void;
}

export default function SortToggle({ sort, q, status, category, sdg, basePath, onNavigate }: Props) {
  function buildUrl(newSort: string) {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = { sort: newSort, q, status, category, sdg };
    for (const [k, v] of Object.entries(current)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return `${basePath ?? "/projects"}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {SORT_OPTIONS.map((s) => {
        const href = buildUrl(s.value);
        return (
          <a
            key={s.value}
            href={href}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(href);
            }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              sort === s.value
                ? "bg-white text-dark-slate shadow-sm"
                : "text-dark-slate/60 hover:text-dark-slate"
            }`}
          >
            {s.label}
          </a>
        );
      })}
    </div>
  );
}
