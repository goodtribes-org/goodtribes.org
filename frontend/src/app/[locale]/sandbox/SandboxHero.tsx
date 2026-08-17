import { handwritingFontThin } from "@/lib/fonts";

const HERO_IMAGE = "/img/what-is-goodtribes.png";

// Same "Polaroid" placement as the project page hero
// (projects/[slug]/page.tsx, lines ~300-350): a big photo card and a
// narrower text card, tilted opposite ways with a heavy drop shadow,
// overlapping slightly, sized to overflow past the full-bleed blurred
// backdrop's bottom edge. Unlike the project hero's second card, this one
// keeps square corners instead of rounded-2xl. The photo card also
// borrows the project hero's caption convention — page name written on
// the white border above the image, tagline below it.
const CARD_SHADOW_STYLE = { boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)" };

export default function SandboxHero({
  kicker,
  description,
  photoName,
  photoCaption,
}: {
  kicker: string;
  description: string;
  photoName: string;
  photoCaption: string;
}) {
  return (
    <div className="relative">
      <div className="absolute top-0 left-0 right-0 overflow-hidden h-[380px] sm:h-[430px] md:h-[490px]">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110" />
      </div>

      <div className="relative z-10 flex justify-center px-4 pt-14 pb-16">
        <div className="flex flex-wrap justify-center gap-5 items-stretch w-full max-w-[1160px]">
          {/* Bild — stor, till vänster */}
          <div
            className="hidden md:block shrink-0 bg-white w-full max-w-[660px] 2xl:max-w-[820px]"
            style={{ ...CARD_SHADOW_STYLE, padding: "0px 24px 0px", transform: "rotate(-3deg)", position: "relative", zIndex: 1 }}
          >
            <p className={`${handwritingFontThin.className} text-center truncate px-2`} style={{ fontSize: 26, lineHeight: "40px", color: "#1a3d8f", transform: "translateY(2px)" }}>
              {photoName}
            </p>
            <div className="relative w-full h-64 sm:h-80 md:h-[400px] 2xl:h-[460px] mt-[3px] overflow-hidden">
              <img src={HERO_IMAGE} alt={kicker} className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <p className={`${handwritingFontThin.className} text-center truncate px-2 mt-[3px]`} style={{ fontSize: 26, lineHeight: "40px", color: "#1a3d8f" }}>
              {photoCaption}
            </p>
          </div>

          {/* Text — smal, till höger, fyrkantiga hörn */}
          <div
            className="shrink-0 bg-white p-5 flex flex-col justify-center w-full max-w-[320px] min-h-0 md:min-h-[400px] 2xl:min-h-[460px]"
            style={{ ...CARD_SHADOW_STYLE, marginLeft: "-10px", transform: "rotate(3deg)" }}
          >
            <div className="border border-muted-teal/20 px-4 py-4 bg-amber-50 overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold text-amber-900" style={{ textWrap: "balance" }}>
                {kicker}
              </h2>
              <p className="mt-2 text-amber-800 text-xs leading-relaxed">{description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
