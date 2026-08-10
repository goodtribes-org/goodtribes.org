// The three pillar icons are the original GoodTribe artwork (Leva Gott /
// Må Gott / Göra Gott), recovered from the old dev-goodtribe.pantheonsite.io
// site — see /public/img/pillar-*. Colors are matched to the icons' own
// natural hues via existing theme tokens rather than the sandbox's coral
// accent. The trees now live in SandboxHero, directly above this. Each
// header fades from the pillar's base color, same "strong color → fade out"
// treatment as the original sandbox-hero concept mockup.
const PILLARS = [
  { icon: "/img/pillar-leva-gott.png", color: "var(--color-seagrass)", key: "levaGott" as const },
  { icon: "/img/pillar-ma-gott.png", color: "var(--color-navy)", key: "maGott" as const },
  { icon: "/img/pillar-gora-gott.png", color: "var(--color-watermelon)", key: "goraGott" as const },
];

export default function Pillars({
  headings,
  bodies,
}: {
  headings: Record<"levaGott" | "maGott" | "goraGott", string>;
  bodies: Record<"levaGott" | "maGott" | "goraGott", string>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {PILLARS.map((p) => (
        <div key={p.key} className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm">
          <div
            className="flex items-center gap-2 px-4 py-3 text-white font-bold text-sm uppercase tracking-wide"
            style={{ background: `linear-gradient(135deg, ${p.color}, color-mix(in srgb, ${p.color} 30%, white))` }}
          >
            <span className="bg-white rounded-full p-1 flex items-center justify-center flex-shrink-0 w-7 h-7">
              <img src={p.icon} alt="" className="h-4 w-4 object-contain" />
            </span>
            <span>{headings[p.key]}</span>
          </div>
          <div className="p-4">
            <p className="text-xs text-dark-slate/70 leading-relaxed text-center">{bodies[p.key]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
