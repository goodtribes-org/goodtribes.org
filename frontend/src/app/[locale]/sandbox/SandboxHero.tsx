const CARD_SHADOW =
  "shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.15)] ring-1 ring-black/5";

export default function SandboxHero({
  kicker,
  description,
}: {
  kicker: string;
  description: string;
}) {
  return (
    // Normal flow with sane top clearance (pt-8) for the nav bar. A negative
    // bottom margin pulls whatever comes after this (Pillars/trees) closer
    // without needing to guess the card's rendered height — unlike the
    // earlier absolute-positioned/bottom-anchored attempt, which pushed the
    // card's top past a too-small reserved box and into the nav.
    <div className="flex justify-center px-4 pt-14 pb-2 mb-[-64px]">
      <div className={`relative z-0 w-full max-w-xl bg-white p-3 ${CARD_SHADOW}`}>
        <div className="border border-muted-teal/20 px-4 sm:px-6 py-4 sm:py-5 bg-amber-50 text-left">
          <h2 className="text-xl sm:text-3xl font-bold text-amber-900" style={{ textWrap: "balance" }}>
            {kicker}
          </h2>
          <p className="mt-3 text-amber-800 text-xs sm:text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
