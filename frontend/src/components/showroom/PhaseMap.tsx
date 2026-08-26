import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import Link from "next/link";
import { homeSansFont, showroomMonoFont } from "@/lib/fonts";

export type PhaseMapStep = {
  value: string;
  label: string;
  count: number;
  chips: { title: string; slug: string; isSandbox: boolean }[];
};

export default async function PhaseMap({ locale, steps, copy }: { locale: Locale; steps: PhaseMapStep[]; copy: Record<string, string> }) {
  const t = await getTranslations({ locale, namespace: "HomePage.phaseMap" });
  const c = (key: string) => copy[`HomePage.phaseMap.${key}`] ?? t(key);

  return (
    <div
      className={`${homeSansFont.className} w-full`}
      style={{ marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)", width: "100vw", background: "#fafaf8", borderTop: "1px solid rgba(178,176,155,.35)", borderBottom: "1px solid rgba(178,176,155,.35)" }}
    >
      <div className="max-w-[1160px] mx-auto px-8" style={{ padding: "56px 32px" }}>
        <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)" }}>
          {c("eyebrow").toUpperCase()}
        </p>
        <h2 className="text-dark-slate" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.01em", marginTop: 8, marginBottom: 32 }}>
          {c("heading")}
        </h2>
        <div className="grid gap-px bg-muted-teal/20 border border-muted-teal/20 rounded-[10px] overflow-hidden" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          {steps.map((step) => (
            <div key={step.value} className="bg-white flex flex-col" style={{ padding: 20, gap: 10 }}>
              <div className="flex items-baseline justify-between">
                <span className="text-dark-slate" style={{ fontSize: 14, fontWeight: 600 }}>{step.label}</span>
                <span className="text-dark-slate/40" style={{ fontSize: 12 }}>{step.count}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {step.chips.length === 0 ? (
                  <span className="text-dark-slate/35" style={{ fontSize: 12 }}>{c("emptyState")}</span>
                ) : (
                  step.chips.map((chip) => (
                    <Link
                      key={chip.slug}
                      href={`/projects/${chip.slug}`}
                      className={`rounded-full border transition-colors truncate ${
                        chip.isSandbox
                          ? "border-orange-500/50 text-orange-600 hover:border-orange-500 hover:bg-orange-50"
                          : "border-seagrass/50 text-seagrass hover:border-seagrass hover:bg-seagrass/10"
                      }`}
                      style={{ fontSize: 11.5, padding: "3px 9px", maxWidth: 140 }}
                      title={chip.title}
                    >
                      {chip.title}
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
