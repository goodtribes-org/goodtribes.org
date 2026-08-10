// Icons are the original GoodTribe artwork recovered from
// dev-goodtribe.pantheonsite.io (infosdator/good/dreamfab.png) — the three
// dreams/projects the original site featured.
const ITEMS = [
  { icon: "/img/card-infos-datordonation.png", key: "infos" as const },
  { icon: "/img/card-goodtribe.png", key: "goodtribe" as const },
  { icon: "/img/card-dromlabbet.png", key: "dromlabbet" as const },
];

export default function FeaturedDreams({
  sectionHeading,
  headings,
  bodies,
}: {
  sectionHeading: string;
  headings: Record<"infos" | "goodtribe" | "dromlabbet", string>;
  bodies: Record<"infos" | "goodtribe" | "dromlabbet", string>;
}) {
  return (
    <div className="mb-10">
      <h2 className="text-center text-lg font-bold text-dark-slate mb-4">{sectionHeading}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ITEMS.map((item) => (
          <div key={item.key} className="bg-white border border-amber-200 rounded-xl p-5 flex flex-col items-center text-center gap-3">
            <img src={item.icon} alt="" className="h-20 w-auto rounded" />
            <h3 className="font-bold text-dark-slate text-sm">{headings[item.key]}</h3>
            <p className="text-xs text-dark-slate/70 leading-relaxed">{bodies[item.key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
