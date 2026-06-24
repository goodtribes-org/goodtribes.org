"use client";

import { useRouter } from "next/navigation";

export default function MembersFilter({
  skills,
  activeSkill,
  total,
}: {
  skills: { slug: string; name: string }[];
  activeSkill?: string;
  total: number;
}) {
  const router = useRouter();

  function toggle(slug: string) {
    if (activeSkill === slug) router.push("/members");
    else router.push(`/members?skill=${encodeURIComponent(slug)}`);
  }

  return (
    <div className="mb-8">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-dark-slate/50 font-medium mr-1">Filter by skill</span>
        {skills.map((s) => (
          <button
            key={s.slug}
            onClick={() => toggle(s.slug)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              activeSkill === s.slug
                ? "bg-seagrass text-white border-seagrass"
                : "border-muted-teal text-dark-slate/70 hover:border-seagrass hover:text-dark-slate"
            }`}
          >
            {s.name}
          </button>
        ))}
        {activeSkill && (
          <button onClick={() => router.push("/members")} className="text-xs text-coral hover:underline ml-1">
            Clear ({total})
          </button>
        )}
      </div>
    </div>
  );
}
