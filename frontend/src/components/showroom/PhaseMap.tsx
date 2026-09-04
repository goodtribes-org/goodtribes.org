import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import Link from "next/link";
import { siteSansFont, showroomMonoFont } from "@/lib/fonts";

export type PhaseMapStep = {
  value: string;
  label: string;
  count: number;
  chips: { title: string; slug: string; isSandbox: boolean }[];
};

// One simple stroke icon per display phase, in order (Idé, Uppstart,
// Lansering, Etablera, Skala, Impact) -- same minimal-line-icon style as
// ToolsGrid.tsx, reusing its exact lightbulb path for "Idé" so the two
// sections stay visually consistent.
const PHASE_ICONS = [
  <path key="idea" d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.3.2.5.6.5 1v.6h6v-.6c0-.4.2-.8.5-1A6 6 0 0012 3z" />,
  <path key="launch" d="M12 19V5M5 12l7-7 7 7" />,
  <path key="flag" d="M6 3v18M6 4h12l-3 4 3 4H6" />,
  <path key="build" d="M4 21V9l8-6 8 6v12M9 21v-7h6v7" />,
  <path key="scale" d="M4 20h16M7 20v-6M12 20v-9M17 20v-4" />,
  <path key="impact" d="M12 20s-7-4.4-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.6-9 9-9 9z" />,
];

// Interpolates from coral (idea stage) to seagrass (impact stage) across
// however many phases are actually rendered -- reuses the two brand colors
// already established elsewhere on the page instead of inventing a new
// palette, so the row reads as one deliberate "spark to impact" gradient.
function phaseColor(index: number, total: number) {
  const t = total > 1 ? index / (total - 1) : 0;
  return `color-mix(in oklab, var(--color-seagrass) ${Math.round(t * 100)}%, var(--color-coral) ${Math.round((1 - t) * 100)}%)`;
}

export default async function PhaseMap({ locale, steps, copy }: { locale: Locale; steps: PhaseMapStep[]; copy: Record<string, string> }) {
  const t = await getTranslations({ locale, namespace: "HomePage.phaseMap" });
  const c = (key: string) => copy[`HomePage.phaseMap.${key}`] ?? t(key);

  return (
    <div
      className={`${siteSansFont.className} w-full`}
      style={{ marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)", width: "100vw", background: "#fafaf8", borderBottom: "1px solid rgba(178,176,155,.35)" }}
    >
      <div className="max-w-6xl mx-auto px-6" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)" }}>
          {c("eyebrow").toUpperCase()}
        </p>
        <h2 className="text-dark-slate" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.01em", marginTop: 8, marginBottom: 40 }}>
          {c("heading")}
        </h2>

        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)`, columnGap: 4 }}>
          <div
            className="hidden sm:flex absolute"
            style={{ top: 22, left: `${100 / (2 * steps.length)}%`, right: `${100 / (2 * steps.length)}%` }}
            aria-hidden="true"
          >
            {steps.slice(1).map((_, i) => (
              <div key={i} className="flex-1" style={{ borderTop: `2px dashed ${phaseColor(i + 0.5, steps.length)}` }} />
            ))}
          </div>

          {steps.map((step, i) => {
            const color = phaseColor(i, steps.length);
            return (
              <div key={step.value} className="relative flex flex-col items-center" style={{ gap: 10, padding: "0 8px" }}>
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: 44, height: 44, background: `color-mix(in oklab, ${color} 14%, white)` }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    {PHASE_ICONS[i]}
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-dark-slate" style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {step.label} <span className="text-dark-slate/40" style={{ fontWeight: 400 }}>({step.count})</span>
                  </p>
                </div>
                {step.chips.length > 0 && (
                  <div
                    className="rounded-xl flex flex-wrap items-center justify-center gap-1.5 w-full"
                    style={{ padding: "10px 8px", minHeight: 52 }}
                  >
                    {step.chips.map((chip) => (
                      <Link
                        key={chip.slug}
                        href={`/projects/${chip.slug}`}
                        className={`rounded-full border bg-white transition-colors truncate ${
                          chip.isSandbox
                            ? "border-orange-500/50 text-orange-600 hover:border-orange-500 hover:bg-orange-50"
                            : "border-seagrass/50 text-seagrass hover:border-seagrass hover:bg-seagrass/10"
                        }`}
                        style={{ fontSize: 11.5, padding: "3px 9px", maxWidth: 140 }}
                        title={chip.title}
                      >
                        {chip.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
