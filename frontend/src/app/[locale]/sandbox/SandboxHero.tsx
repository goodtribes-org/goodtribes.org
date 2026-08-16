import { CARD_SHADOW } from "@/lib/heroCardStyle";

const HERO_IMAGE = "/img/what-is-goodtribes.png";

export default function SandboxHero({
  kicker,
  description,
}: {
  kicker: string;
  description: string;
}) {
  return (
    <div className="relative">
      {/* Bakgrund: samma bild, blurrad, kant till kant */}
      <div className="absolute inset-0 overflow-hidden">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110" />
      </div>

      <div className="relative z-10 flex justify-center px-4 pt-14 pb-10">
        <div className="grid w-full max-w-6xl gap-8 items-center md:grid-cols-2">
          {/* Bild — till vänster */}
          <div className="hidden md:flex items-center justify-self-center w-full" style={{ maxWidth: 620 }}>
            <div className="relative w-full" style={{ aspectRatio: "16 / 10" }}>
              <div className={`absolute inset-0 overflow-hidden bg-white p-3 ${CARD_SHADOW}`}>
                <div className="relative h-full w-full overflow-hidden">
                  <img src={HERO_IMAGE} alt={kicker} className="absolute inset-0 w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>

          {/* Text — till höger */}
          <div className="w-full md:max-w-[620px] md:aspect-[16/10]">
            <div className={`relative h-full bg-white p-3 ${CARD_SHADOW}`}>
              <div className="h-full border border-muted-teal/20 px-4 sm:px-6 py-4 sm:py-5 bg-amber-50 flex flex-col justify-center text-left">
                <h2 className="text-xl sm:text-3xl font-bold text-amber-900" style={{ textWrap: "balance" }}>
                  {kicker}
                </h2>
                <p className="mt-3 text-amber-800 text-xs sm:text-sm leading-relaxed">{description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
