const CARD_SHADOW =
  "shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.15)] ring-1 ring-black/5";

// Trees + connecting line recovered from the old GoodTribe site
// (dev-goodtribe.pantheonsite.io) — see /public/img/sandbox-tree-*.png and
// hero-connector-line.png. On the original, the trees are absolutely
// positioned larger than the content box and overlap outside/above it
// (measured: tree canvas ~320px vs. an ~1055px-wide box, offset -108px/-53px)
// — reproduced here as oversized trees overlapping the card's outer corners
// rather than sitting neatly beside it.
const TREE_LEFT = { src: "/img/sandbox-tree-left.png", alt: "" };
const TREE_RIGHT = { src: "/img/sandbox-tree-right.png", alt: "" };
const LINE = { src: "/img/hero-connector-line.png", alt: "" };

export default function SandboxHero({
  kicker,
  description,
}: {
  kicker: string;
  description: string;
}) {
  return (
    <div className="flex justify-center px-4 pt-24 sm:pt-28 pb-2">
      <div className="relative w-full max-w-2xl">
        <img
          src={TREE_LEFT.src}
          alt={TREE_LEFT.alt}
          className="absolute -left-10 sm:-left-20 md:-left-28 -top-16 sm:-top-20 md:-top-24 w-32 sm:w-48 md:w-64 h-auto z-20 pointer-events-none select-none"
        />
        <img
          src={TREE_RIGHT.src}
          alt={TREE_RIGHT.alt}
          className="absolute -right-10 sm:-right-20 md:-right-28 -top-16 sm:-top-20 md:-top-24 w-32 sm:w-48 md:w-64 h-auto z-20 pointer-events-none select-none"
        />
        <img
          src={LINE.src}
          alt={LINE.alt}
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full z-0 opacity-70 pointer-events-none"
        />
        <div className={`relative z-10 bg-white p-3 ${CARD_SHADOW}`}>
          <div className="border border-muted-teal/20 px-4 sm:px-6 py-4 sm:py-5 bg-amber-50 text-left">
            <h2 className="text-xl sm:text-3xl font-bold text-amber-900" style={{ textWrap: "balance" }}>
              {kicker}
            </h2>
            <p className="mt-3 text-amber-800 text-xs sm:text-sm leading-relaxed">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
