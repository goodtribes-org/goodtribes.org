// The two tree illustrations and three pillar icons are the original
// GoodTribe artwork (Leva Gott / Må Gott / Göra Gott), recovered from the
// old dev-goodtribe.pantheonsite.io site — see /public/img/sandbox-tree-*
// and /public/img/pillar-*. Colors are matched to the icons' own natural
// hues via existing theme tokens rather than the sandbox's coral accent.
const PILLARS = [
  { icon: "/img/pillar-leva-gott.png", color: "var(--color-seagrass)", key: "levaGott" as const },
  { icon: "/img/pillar-ma-gott.png", color: "var(--color-navy)", key: "maGott" as const },
  { icon: "/img/pillar-gora-gott.png", color: "var(--color-watermelon)", key: "goraGott" as const },
];

export default function TreesAndPillars({
  headings,
  bodies,
}: {
  headings: Record<"levaGott" | "maGott" | "goraGott", string>;
  bodies: Record<"levaGott" | "maGott" | "goraGott", string>;
}) {
  return (
    <div className="mb-10">
      <div className="flex items-end justify-between px-2 sm:px-8 -mb-6">
        <img src="/img/sandbox-tree-left.png" alt="" className="w-24 sm:w-36 h-auto flex-shrink-0" />
        <img src="/img/sandbox-tree-right.png" alt="" className="w-24 sm:w-36 h-auto flex-shrink-0" />
      </div>
      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PILLARS.map((p) => (
          <div key={p.key} className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 text-white font-bold text-sm uppercase tracking-wide" style={{ backgroundColor: p.color }}>
              {headings[p.key]}
            </div>
            <div className="p-4 flex flex-col items-center text-center gap-3">
              <img src={p.icon} alt={headings[p.key]} className="h-14 w-auto" />
              <p className="text-xs text-dark-slate/70 leading-relaxed">{bodies[p.key]}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
