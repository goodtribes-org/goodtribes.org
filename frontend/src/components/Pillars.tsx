import { CARD_SHADOW } from "@/lib/heroCardStyle";

// The two tree illustrations are the original GoodTribe artwork recovered
// from the old dev-goodtribe.pantheonsite.io site — see
// /public/img/sandbox-tree-*.png. The pillar icons are simple white-line
// SVGs (from the very first sandbox-hero concept mockup) rather than the
// recovered PNGs — cleaner against the colored gradient header. The trees
// sit above the row's outer two slots (whichever pillars occupy them —
// currently Dröm stort / Leva Gott), hidden on mobile where the grid stacks
// to a single column and "outer corner" stops being meaningful. Each header
// fades from the pillar's base color, the "strong color → fade out"
// treatment from that same concept mockup. Row width follows the original's
// measured ratio (tree width ≈ 30% of its container) — with the trees sized
// up, the row widens back out to match rather than staying artificially
// narrow. PILLARS' array order is the display order (left to right).
//
// The optional centered textbox between the trees recreates the original
// GoodTribe hero layout (trees flanking a single textbox, recovered from
// dev-goodtribe.pantheonsite.io) from back when this lived on /sandbox —
// same card styling as that recovered design, just without the connector
// line PNG (deleted when the trees moved to flank this row instead).
function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 3c1 8-2 15-9 17z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </svg>
  );
}

function ThumbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4.24 12.6c.6.46.94 1.16 1.02 1.9L9 18h6l.22-1.5c.08-.74.42-1.44 1.02-1.9A7 7 0 0 0 12 2z" />
    </svg>
  );
}

const PILLARS = [
  { Icon: LeafIcon, color: "var(--color-seagrass)", key: "levaGott" as const },
  { Icon: ThumbIcon, color: "var(--color-navy)", key: "maGott" as const },
  { Icon: HeartIcon, color: "var(--color-watermelon)", key: "goraGott" as const },
  { Icon: BulbIcon, color: "var(--color-coral)", key: "dreamGood" as const },
];

const TREE_LEFT = { src: "/img/sandbox-tree-left.png", alt: "" };
const TREE_RIGHT = { src: "/img/sandbox-tree-right.png", alt: "" };

export default function Pillars({
  heading,
  body,
  headings,
  bodies,
}: {
  heading?: string;
  body?: string;
  headings: Record<"levaGott" | "maGott" | "goraGott" | "dreamGood", string>;
  bodies: Record<"levaGott" | "maGott" | "goraGott" | "dreamGood", string>;
}) {
  return (
    <div className="pt-0 sm:pt-20">
      <div className="relative max-w-4xl mx-auto">
        {/* bottom-full anchors each tree's bottom edge to the row's top edge
            with zero overlap; the negative margin-bottom then pulls it down
            by a small, fixed amount so the branch tips overflow past the
            Leva Gott / Göra Gott cards' outer corners. */}
        <img
          src={TREE_LEFT.src}
          alt={TREE_LEFT.alt}
          className="hidden sm:block absolute left-[-86px] md:left-[-130px] bottom-full mb-[-28px] md:mb-[-43px] w-[230px] md:w-[317px] h-auto z-20 pointer-events-none select-none"
        />
        <img
          src={TREE_RIGHT.src}
          alt={TREE_RIGHT.alt}
          className="hidden sm:block absolute right-[-86px] md:right-[-130px] bottom-full mb-[-43px] md:mb-[-58px] w-[230px] md:w-[317px] h-auto z-20 pointer-events-none select-none"
        />

        {/* z-0 (istället för z-10) så trädens grenar hamnar framför rutan, inte bakom den. */}
        {heading && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-6 md:mb-10 z-0 w-full max-w-lg sm:max-w-xl px-4">
            <div className={`bg-white p-3 ${CARD_SHADOW}`}>
              <div className="border border-muted-teal/20 px-4 sm:px-6 py-4 sm:py-5 bg-amber-50 text-center">
                <h2 className="text-lg sm:text-2xl font-bold text-amber-900" style={{ textWrap: "balance" }}>
                  {heading}
                </h2>
                {body && (
                  <p className="mt-2 text-amber-800 text-xs sm:text-sm leading-relaxed">
                    {body}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p, i) => (
            <div
              key={p.key}
              className="bg-white border border-[#ecd9a8] rounded-[14px] overflow-hidden shadow-[0_10px_24px_-14px_rgba(37,68,65,0.18)]"
              style={
                i === 0
                  ? { transform: "translateX(-10px)" }
                  : i === 1
                    ? { transform: "translateX(-5px)" }
                    : undefined
              }
            >
              <div
                className="flex items-center gap-2 px-4 py-3 text-white font-bold text-sm uppercase tracking-wide"
                style={{ background: `linear-gradient(135deg, ${p.color}, color-mix(in srgb, ${p.color} 30%, white))` }}
              >
                <p.Icon />
                <span>{headings[p.key]}</span>
              </div>
              <div className="p-4">
                <p className="text-xs text-dark-slate/70 leading-relaxed text-center">{bodies[p.key]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
