import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { newHomeDisplayFont } from "./fonts";

// The "Fem steg" module: started as the same content/images as the plain
// HomePage's StepsCarousel (@/components/showroom/StepsCarousel), forked
// into its own NewHomePage.steps translations so this page's copy (e.g.
// step0Label) can diverge without touching the live HomePage. Shown as 5
// equal-weight standalone cards in a single row instead of an interactive
// tab carousel — echoes the tool-tile grid further down the page
// (ToolsRow). The step number is inline in the label ("1. Hitta din
// dröm") rather than a badge over the image, and the image uses its
// native 16:9 aspect ratio so object-cover doesn't have to crop it.
const INK = "#1B1F1D";
const MUTED = "#4A514D";
const LINK = "#C2410C";

// Images deliberately shuffled relative to their step's text (requested):
// 1<->5, 2->1, 4->2, 5->4, 3 unchanged.
const STEPS = [
  "Slide2.png",
  "want-a-change.png",
  "what-is-goodtribes.png",
  "want-to-be-a-winner.png",
  "do-you-have-a-dream.png",
] as const;

export default async function StepsGrid({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "NewHomePage.steps" });

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 sm:px-8 lg:px-16">
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm font-bold uppercase tracking-[.12em]" style={{ color: LINK }}>{t("eyebrow")}</p>
        <h2
          className={`${newHomeDisplayFont.className} m-0 max-w-[720px] font-extrabold`}
          style={{ fontSize: "clamp(2rem, 4vw, 52px)", lineHeight: 1.05, letterSpacing: "-0.03em", color: INK }}
        >
          {t("heading")}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((img, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-[#E4E4DF] bg-white">
            <div className="relative aspect-video">
              <img src={`/img/${img}`} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-5">
              <p className="m-0 text-xs font-bold uppercase tracking-[.1em]" style={{ color: LINK }}>{i + 1}. {t(`step${i}Label`)}</p>
              <h3 className="m-0 text-[15px] font-bold leading-snug" style={{ color: INK }}>{t(`step${i}Title`)}</h3>
              <p className="m-0 text-[13px] leading-snug" style={{ color: MUTED }}>{t(`step${i}Body`)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
