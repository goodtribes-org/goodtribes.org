const HERO_IMAGE = "/img/what-is-goodtribes.png";

// Same "Polaroid" placement as the project page hero
// (projects/[slug]/page.tsx) — full-bleed blurred backdrop at a fixed
// height, cards tilted opposite ways with a heavy drop shadow and square
// corners, sized to overflow past the backdrop's bottom edge. Unlike the
// project hero (whose second card is a narrower team/SDG sidebar), both
// cards here are kept the same size since this hero only has an image and
// a text card to place.
const CARD_SHADOW_STYLE = { boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)" };

export default function SandboxHero({
  kicker,
  description,
}: {
  kicker: string;
  description: string;
}) {
  return (
    <div className="relative">
      <div className="absolute top-0 left-0 right-0 overflow-hidden h-[380px] sm:h-[430px] md:h-[490px]">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110" />
      </div>

      <div className="relative z-10 flex justify-center px-4 pt-14 pb-16">
        <div className="grid w-full max-w-6xl gap-8 items-stretch md:grid-cols-2">
          {/* Bild — till vänster */}
          <div
            className="hidden md:block bg-white p-3"
            style={{ ...CARD_SHADOW_STYLE, transform: "rotate(-3deg)" }}
          >
            <div className="relative w-full h-64 sm:h-80 md:h-[400px] overflow-hidden">
              <img src={HERO_IMAGE} alt={kicker} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          </div>

          {/* Text — till höger */}
          <div
            className="bg-white p-3"
            style={{ ...CARD_SHADOW_STYLE, transform: "rotate(3deg)" }}
          >
            <div className="h-64 sm:h-80 md:h-[400px] border border-muted-teal/20 px-4 sm:px-6 py-4 sm:py-5 bg-amber-50 flex flex-col justify-center text-left overflow-y-auto">
              <h2 className="text-xl sm:text-3xl font-bold text-amber-900" style={{ textWrap: "balance" }}>
                {kicker}
              </h2>
              <p className="mt-3 text-amber-800 text-xs sm:text-sm leading-relaxed">{description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
