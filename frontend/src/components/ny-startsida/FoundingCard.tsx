import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { getFoundingStoryData } from "@/lib/impactReports";
import {
  STAT_CIRCLE_HIDE_APPROX_SYMBOL, STAT_CIRCLE_LABELS, STAT_CIRCLE_MERGE_INTO, STAT_CIRCLE_UNIT_OVERRIDES,
  formatStatNumber, sponsorLogosFor,
} from "@/components/showroom/FoundingStory";
import { MUTED, SUBTLE, SectionHeader, card, wrap } from "./Sections";
import { newHomeDisplayFont } from "./fonts";

// "Det började med datorer som skulle skrotas" in the design's layout: story
// and sponsor logos on the left, four circles on the right. The figures come
// from the project's verified impact reports through the same helpers as
// FoundingStory on the old start page, so both pages always show the same
// numbers the same way; only the prose is this page's own.
const CIRCLE_COLORS = ["#E8531F", "#2F7D3A", "#12486C", "#C62828"];
const LOGO_HEIGHTS: Record<string, number> = { "Stockholms stad": 40, Coop: 32, OKQ8: 30 };
const PROJECT_SLUG = "infos-datordonation";

export default async function FoundingCard({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "NewHomePage.founding" });
  const data = await getFoundingStoryData(PROJECT_SLUG);
  // Seeded data, not a schema guarantee: no project, no section.
  if (!data) return null;

  const { delivered, supportReceived } = data;
  const circles = delivered.filter((r) => !(r.id in STAT_CIRCLE_MERGE_INTO)).slice(0, 4);
  const logos = supportReceived
    .flatMap((r) => sponsorLogosFor(r.sourceName ?? ""))
    .filter((logo, i, all) => all.findIndex((l) => l.src === logo.src) === i);

  return (
    <section className={`${wrap} flex flex-col gap-6 pt-[48px]`}>
      <SectionHeader eyebrow={t("eyebrow")} heading={t("heading")} />
      <div className={`${card} flex flex-col items-center gap-10 p-6 sm:p-10 lg:flex-row lg:gap-16 lg:p-16`}>
        <div className="flex flex-1 flex-col gap-[18px]">
          <h3 className={`${newHomeDisplayFont.className} m-0 text-2xl font-bold tracking-[-0.01em]`}>{t("storyHeading")}</h3>
          <p className="m-0 text-lg leading-[1.65]" style={{ color: MUTED }}>{t("body")}</p>
          {logos.length > 0 && (
            <div className="flex flex-wrap items-center gap-7 pt-2">
              <p className="m-0 text-[13px] font-bold uppercase tracking-[.1em]" style={{ color: SUBTLE }}>{t("supportLabel")}</p>
              {logos.map((logo) => (
                <img key={logo.src} src={logo.src} alt={logo.alt} style={{ height: LOGO_HEIGHTS[logo.alt] ?? 32, width: "auto" }} />
              ))}
            </div>
          )}
        </div>

        {circles.length > 0 && (
          <div className="grid shrink-0 grid-cols-2 gap-5">
            {circles.map((r, i) => {
              const label = STAT_CIRCLE_LABELS[r.id];
              const unit = STAT_CIRCLE_UNIT_OVERRIDES[r.id] ?? r.metricUnit;
              const millionsInUnit = r.id in STAT_CIRCLE_UNIT_OVERRIDES && r.metricValue >= 1_000_000;
              const merged = delivered.find((other) => STAT_CIRCLE_MERGE_INTO[other.id] === r.id);
              return (
                <div
                  key={r.id}
                  className="flex h-[150px] w-[150px] flex-col items-center justify-center gap-1 rounded-full text-center text-white sm:h-[176px] sm:w-[176px]"
                  style={{ background: CIRCLE_COLORS[i % CIRCLE_COLORS.length] }}
                >
                  {label && <p className="m-0 text-[13px] font-semibold">{label}</p>}
                  <p className={`${newHomeDisplayFont.className} m-0 px-2 text-[28px] font-extrabold leading-[1.05] sm:text-[34px]`}>
                    {formatStatNumber(r.metricValue, r.valueQualifier, locale, {
                      hideApprox: STAT_CIRCLE_HIDE_APPROX_SYMBOL.has(r.id),
                      millionsInUnit,
                    })}
                  </p>
                  {merged ? (
                    <p className="m-0 text-[13px]">
                      {formatStatNumber(merged.metricValue, merged.valueQualifier, locale)} {STAT_CIRCLE_LABELS[merged.id]?.toLowerCase()}
                    </p>
                  ) : (
                    unit && <p className="m-0 text-[13px]">{unit}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
