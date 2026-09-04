import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { siteSansFont, showroomMonoFont } from "@/lib/fonts";
import { SdgIcon } from "@/components/SdgIcon";
import { getFoundingStoryData, verifiedSdgGoals } from "@/lib/impactReports";

type Report = NonNullable<Awaited<ReturnType<typeof getFoundingStoryData>>>["delivered"][number];

// Cycled by index across the delivered-impact circles so an arbitrary number
// of figures still reads as deliberately colorful rather than repetitive.
const STAT_CIRCLE_COLORS = [
  "var(--color-coral)",
  "var(--color-seagrass)",
  "var(--color-navy)",
  "var(--color-watermelon)",
  "var(--color-leaf)",
];

// A short category word above the number, curated per report id rather than
// derived from metricDescription (too long for a circle) or left generic.
// Reports without a curated label here just skip the line.
const STAT_CIRCLE_LABELS: Record<string, string> = {
  "infos-units-total": "Donerat",
  "infos-equipment-purchase-value": "Inköpsvärde",
  "infos-co2-total": "Utsläppsminskning",
};

// Overrides the plain metricUnit ("kr") with a fuller phrase for circles
// where the bare unit alone would read strangely once "miljoner" moves down
// into this line (see millionsInUnit below) — "kr" alone under "~147,5"
// doesn't say "147,5 *million*", "miljoner kronor" does.
const STAT_CIRCLE_UNIT_OVERRIDES: Record<string, string> = {
  "infos-equipment-purchase-value": "miljoner kronor",
  "infos-co2-total": "Ton CO2",
};

// Presentational only, per explicit direction — the report itself stays
// APPROXIMATE either way (VerifiedImpactPanel on the project page always
// shows the honest qualifier word regardless of this). The CO2 circle reads
// cleaner without a "~" even though the figure is still modelled, not
// counted; the purchase-value circle keeps its "~" since the underlying
// number is a linear extrapolation, a step further removed from the source
// than CO2's direct-formula estimate.
const STAT_CIRCLE_HIDE_APPROX_SYMBOL = new Set(["infos-co2-total"]);

// Compact "25 000+" / "~147,5" style formatting for the circles — terser
// than the qualifier words (minst/ca) used in the full project-page report
// list, since a circle has room for a number and nothing else. Millions
// round to at most one decimal so a real-world value like 50 000 000 reads
// as "50" rather than hiding a less-round underlying figure. When
// millionsInUnit is set, the "miljoner" word is left for the unit line
// (STAT_CIRCLE_UNIT_OVERRIDES) instead of being appended here, so it isn't
// stated twice.
function formatStatNumber(
  value: number,
  qualifier: Report["valueQualifier"],
  locale: string,
  { hideApprox = false, millionsInUnit = false }: { hideApprox?: boolean; millionsInUnit?: boolean } = {},
) {
  let numberPart: string;
  let suffixWord = "";
  if (value >= 1_000_000) {
    numberPart = (Math.round((value / 1_000_000) * 10) / 10).toLocaleString(locale);
    if (!millionsInUnit) suffixWord = "miljoner";
  } else {
    numberPart = value.toLocaleString(locale);
  }
  const prefix = qualifier === "APPROXIMATE" && !hideApprox ? "~" : "";
  const plus = qualifier === "AT_LEAST" ? "+" : "";
  return `${prefix}${numberPart}${plus}${suffixWord ? ` ${suffixWord}` : ""}`;
}

// ImpactReport.sourceName is free text (e.g. "Coop, OK/Q8 m.fl."), not a
// link to a real Organisation row, so there's no structured field to hang a
// logo off. Matches known sponsor names within that text instead — one
// sourceName can name several sponsors at once, so a single support-received
// row can render more than one logo. Every logo renders into the same fixed
// box (see the fact box below) regardless of its own native size, so a bold
// wordmark like Coop's doesn't visually outweigh a smaller one like OKQ8's.
const SPONSOR_LOGOS = [
  { match: /stockholms?\s*stad/i, src: "/img/sponsors/stockholm-stad.png", alt: "Stockholms stad" },
  { match: /coop/i, src: "/img/sponsors/coop.png", alt: "Coop" },
  { match: /ok\s*\/?\s*q8/i, src: "/img/sponsors/okq8.svg", alt: "OKQ8" },
];

function sponsorLogosFor(sourceName: string) {
  return SPONSOR_LOGOS.filter((logo) => logo.match.test(sourceName));
}

// One concrete example of what a project on this platform can amount to,
// placed between the platform-wide impact numbers and the tools — aggregate
// proof, then a single story that makes it real, then "here's how you do it".
//
// The figures are read live from the project's *verified* impact reports
// rather than written into the copy: a number on the homepage and a number on
// the project page that disagree is exactly the credibility problem the whole
// verification flow exists to prevent. The prose is deliberately number-free
// so the two can never drift apart in the first place.
//
// Renders nothing at all when the configured project doesn't exist in this
// environment (it's seeded data, not a schema guarantee), so a fresh database
// gets no heading over a dead link.
export default async function FoundingStory({
  locale,
  copy,
}: {
  locale: Locale;
  copy: Record<string, string>;
}) {
  const t = await getTranslations({ locale, namespace: "HomePage.foundingStory" });
  const c = (key: string) => copy[`HomePage.foundingStory.${key}`] ?? t(key);

  const data = await getFoundingStoryData(c("projectSlug"));
  if (!data) return null;

  const { project, delivered, supportReceived } = data;
  const paragraphs = [c("body1"), c("body2"), c("body3")].filter(Boolean);
  // Only delivered results define what this project has verified impact *on* —
  // an SDG tagged on a grant it received describes the funder.
  const goals = verifiedSdgGoals(delivered);

  const num = (n: number) => n.toLocaleString(locale);

  // One row per sponsor logo rather than per support-received report: a
  // single report can name several sponsors at once ("Coop, OK/Q8 m.fl."),
  // and there's no per-sponsor split of that report's amount to show next to
  // each one — so logos are deduplicated and shown on their own, and the
  // amounts are summed into one combined total instead (grouped by unit, in
  // case they're ever not all "kr").
  const supportLogos = supportReceived
    .flatMap((r) => sponsorLogosFor(r.sourceName ?? ""))
    .filter((logo, i, all) => all.findIndex((l) => l.src === logo.src) === i);
  const supportTotals = [
    ...supportReceived
      .reduce((totals, r) => {
        const unit = r.metricUnit ?? "";
        totals.set(unit, (totals.get(unit) ?? 0) + r.metricValue);
        return totals;
      }, new Map<string, number>())
      .entries(),
  ];

  return (
    <section className={siteSansFont.className} style={{ paddingTop: 40, paddingBottom: 40 }}>
      <p
        className={showroomMonoFont.className}
        style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)" }}
      >
        {c("eyebrow").toUpperCase()}
      </p>
      <h2
        className="text-dark-slate"
        style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-.015em", lineHeight: 1.25, marginTop: 8, marginBottom: 18 }}
      >
        {c("heading")}
      </h2>

      <div className="flex flex-col lg:flex-row gap-x-12 gap-y-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-4" style={{ marginBottom: 28, maxWidth: 640 }}>
            {paragraphs.map((p, i) => (
              <p key={i} className="text-dark-slate/75" style={{ fontSize: 15, lineHeight: 1.7 }}>
                {p}
              </p>
            ))}
          </div>

          {/* Delivered impact — the headline figures, as colorful circles
              with just the number and its unit: no full caption, no period —
              those live on the project's own impact page (linked below) for
              anyone who wants the detail behind a figure. */}
          {delivered.length > 0 && (
            <div className="flex flex-wrap gap-6" style={{ marginTop: 4 }}>
              {delivered.map((r, i) => {
                const label = STAT_CIRCLE_LABELS[r.id];
                const unit = STAT_CIRCLE_UNIT_OVERRIDES[r.id] ?? r.metricUnit;
                const millionsInUnit = r.id in STAT_CIRCLE_UNIT_OVERRIDES && r.metricValue >= 1_000_000;
                return (
                  <div
                    key={r.id}
                    className="rounded-full flex flex-col items-center justify-center flex-shrink-0 text-center"
                    style={{ width: 152, height: 152, background: STAT_CIRCLE_COLORS[i % STAT_CIRCLE_COLORS.length] }}
                  >
                    {label && (
                      <p className="text-white" style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".01em", marginBottom: 2 }}>
                        {label}
                      </p>
                    )}
                    <p className="text-white font-bold" style={{ fontSize: 23, letterSpacing: "-.01em", lineHeight: 1.15, padding: "0 10px" }}>
                      {formatStatNumber(r.metricValue, r.valueQualifier, locale, {
                        hideApprox: STAT_CIRCLE_HIDE_APPROX_SYMBOL.has(r.id),
                        millionsInUnit,
                      })}
                    </p>
                    {unit && (
                      <p style={{ color: "rgba(255,255,255,.8)", fontSize: 12, lineHeight: 1.2, marginTop: 2 }}>{unit}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p style={{ marginTop: 22 }}>
            <Link
              href={`/projects/${project.slug}`}
              className="text-coral hover:underline"
              style={{ fontSize: 13.5, fontWeight: 500 }}
            >
              {c("cta")} →
            </Link>
            <span className="text-dark-slate/35" style={{ fontSize: 12, marginLeft: 10 }}>
              {c("statsFootnote")}
            </span>
          </p>
        </div>

        {/* Fact box — SDG goals and the sponsors who made the work possible,
            grouped together since both are "context/credit", not results the
            project itself achieved. Sits beside the story text on wide
            screens rather than stacked below everything, since it's
            reference material for the story rather than a continuation of
            it. Stacked vertically internally (rather than the SDG/sponsor
            groups sitting side by side) since the sidebar column is narrow. */}
        {(goals.length > 0 || supportReceived.length > 0) && (
          <div
            className="rounded-xl flex flex-col flex-shrink-0 lg:w-[260px]"
            style={{ background: "#fafaf8", border: "1px solid rgba(178,176,155,.35)", height: "fit-content", overflow: "hidden" }}
          >
            {goals.length > 0 && (
              <div style={{ padding: "20px 22px" }}>
                <p className={showroomMonoFont.className} style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--color-dark-slate)", opacity: .4, marginBottom: 12 }}>
                  {c("sdgLabel").toUpperCase()}
                </p>
                {/* Same size/spacing as the SDG row on the project's own
                    impact panel (VerifiedImpactPanel), for visual parity
                    between the two places these goals show up. */}
                <div className="flex flex-wrap gap-1">
                  {goals.map((n) => (
                    <SdgIcon key={n} n={n} size={24} />
                  ))}
                </div>
              </div>
            )}
            {supportReceived.length > 0 && (
              <div style={{ padding: "18px 22px", borderTop: goals.length > 0 ? "1px solid rgba(178,176,155,.35)" : undefined }}>
                <p className={showroomMonoFont.className} style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--color-dark-slate)", opacity: .4, marginBottom: 14 }}>
                  {c("supportLabel").toUpperCase()}
                </p>
                <div className="flex flex-col gap-4">
                  {supportLogos.map((logo) => (
                    // Fixed box + object-fit so every mark reads at the same
                    // visual weight, whatever its own native proportions —
                    // otherwise a bold wordmark like Coop's dwarfs a smaller
                    // one like OKQ8's at a shared height alone.
                    <div key={logo.src} style={{ width: 116, height: 30 }}>
                      <img src={logo.src} alt={logo.alt} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "left center" }} />
                    </div>
                  ))}
                </div>
                <p className="text-dark-slate/60" style={{ fontSize: 12.5, marginTop: 14 }}>
                  {supportTotals.map(([unit, sum], i) => (
                    <span key={unit}>
                      {i > 0 && " · "}
                      {num(sum)} {unit}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
