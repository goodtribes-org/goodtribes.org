"use client";

import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "concept",    label: "Concept" },
  { value: "prototype",  label: "Prototype" },
  { value: "production", label: "In Production" },
  { value: "delivery",   label: "Delivered" },
];

const CATEGORIES = [
  "Technology", "Environment", "Education", "Arts", "Community", "Health", "Other",
];

const SDG_COLORS: Record<number, string> = {
  1:"#E5243B",2:"#DDA63A",3:"#4C9F38",4:"#C5192D",5:"#FF3A21",
  6:"#26BDE2",7:"#FCC30B",8:"#A21942",9:"#FD6925",10:"#DD1367",
  11:"#FD9D24",12:"#BF8B2E",13:"#3F7E44",14:"#0A97D9",15:"#56C02B",
  16:"#00689D",17:"#19486A",
};

interface Props {
  status?: string;
  category?: string;
  sdg?: string;
  skill?: string;
  skills: { id: string; name: string; slug: string }[];
  total: number;
}

export default function ProjectFilters({ status, category, sdg, skill, skills, total }: Props) {
  const router = useRouter();

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/projects?${params.toString()}`);
  }

  function toggle(key: string, value: string, current?: string) {
    update(key, current === value ? null : value);
  }

  const activeCount = [status, category, sdg, skill].filter(Boolean).length;

  return (
    <div className="space-y-3 mb-6">
      {/* Status pills */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-dark-slate/50 font-medium w-16 shrink-0">Stage</span>
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => toggle("status", s.value, status)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              status === s.value
                ? "bg-coral text-white border-coral"
                : "border-muted-teal text-dark-slate/70 hover:border-seagrass hover:text-dark-slate"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-dark-slate/50 font-medium w-16 shrink-0">Category</span>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => toggle("category", c, category)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              category === c
                ? "bg-seagrass text-white border-seagrass"
                : "border-muted-teal text-dark-slate/70 hover:border-seagrass hover:text-dark-slate"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* SDG chips */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-dark-slate/50 font-medium w-16 shrink-0">SDG</span>
        {Array.from({ length: 17 }, (_, i) => i + 1).map((n) => {
          const active = sdg === String(n);
          return (
            <button
              key={n}
              onClick={() => toggle("sdg", String(n), sdg)}
              title={`SDG ${n}`}
              className={`w-7 h-7 rounded text-xs font-bold text-white transition-all ${
                active ? "ring-2 ring-offset-1 ring-dark-slate scale-110" : "opacity-70 hover:opacity-100"
              }`}
              style={{ backgroundColor: SDG_COLORS[n] }}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* Skill pills */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-dark-slate/50 font-medium w-16 shrink-0">Skill</span>
          {skills.map((s) => (
            <button
              key={s.id}
              onClick={() => toggle("skill", s.slug, skill)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                skill === s.slug
                  ? "bg-dark-slate text-white border-dark-slate"
                  : "border-muted-teal text-dark-slate/70 hover:border-dark-slate/40 hover:text-dark-slate"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Active filter summary */}
      {activeCount > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-dark-slate/50">
            {total} result{total !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => router.push("/projects")}
            className="text-xs text-coral hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
