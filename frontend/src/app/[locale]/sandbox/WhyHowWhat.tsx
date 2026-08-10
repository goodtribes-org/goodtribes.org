// Icons are the original GoodTribe artwork recovered from
// dev-goodtribe.pantheonsite.io (firesoul/getstarted/changedream.png).
const ITEMS = [
  { icon: "/img/icon-why.png", key: "why" as const },
  { icon: "/img/icon-how.png", key: "how" as const },
  { icon: "/img/icon-what.png", key: "what" as const },
];

export default function WhyHowWhat({
  eyebrow,
  headings,
  bodies,
}: {
  eyebrow: string;
  headings: Record<"why" | "how" | "what", string>;
  bodies: Record<"why" | "how" | "what", string>;
}) {
  return (
    <div className="mb-10">
      <p className="text-center text-xs font-bold uppercase tracking-wider text-coral mb-4">{eyebrow}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ITEMS.map((item) => (
          <div key={item.key} className="bg-white border border-amber-200 rounded-xl p-5 flex flex-col items-center text-center gap-3">
            <img src={item.icon} alt="" className="h-16 w-auto" />
            <h3 className="font-bold text-dark-slate uppercase tracking-wide text-sm">{headings[item.key]}</h3>
            <p className="text-xs text-dark-slate/70 leading-relaxed">{bodies[item.key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
