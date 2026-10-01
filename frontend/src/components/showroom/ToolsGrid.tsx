import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import Link from "next/link";
import { siteSansFont, showroomMonoFont } from "@/lib/fonts";
import { TOOLS, COLOR_HEX } from "@/lib/tools";

// Every tool listed here is a real, shipped feature (verified against the
// actual project-workspace routes and models) — this grid is a marketing
// overview, not a deep link, so every card points at /sandbox rather than a
// specific project's route.
export { TOOLS, COLOR_HEX } from "@/lib/tools";

export default async function ToolsGrid({ locale, copy }: { locale: Locale; copy: Record<string, string> }) {
  const t = await getTranslations({ locale, namespace: "HomePage.tools" });
  const c = (key: string) => copy[`HomePage.tools.${key}`] ?? t(key);

  return (
    <div className={`${siteSansFont.className} w-full`}>
      <div style={{ paddingTop: 40, paddingBottom: 32 }}>
        <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)" }}>
          {c("eyebrow").toUpperCase()}
        </p>
        <h2 className="text-dark-slate" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2, letterSpacing: "-.01em", marginTop: 10, maxWidth: "20ch" }}>
          {c("heading")}
        </h2>
        <p className="text-dark-slate/70" style={{ fontSize: 15, lineHeight: 1.6, marginTop: 10, maxWidth: "52ch" }}>
          {c("intro")}
        </p>
      </div>

      <div style={{ paddingBottom: 24 }}>
        <div className="grid gap-px bg-muted-teal/20 border border-muted-teal/20 rounded-[10px] overflow-hidden" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {TOOLS.map((tool) => (
            <div key={tool.key} className="bg-white flex flex-col" style={{ padding: 22, gap: 10 }}>
              <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 30, height: 30, background: `color-mix(in oklab, ${COLOR_HEX[tool.color]} 12%, white)` }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLOR_HEX[tool.color]} strokeWidth={2}>
                  {tool.path}
                </svg>
              </div>
              <p className="text-dark-slate" style={{ fontWeight: 600, fontSize: 14 }}>{c(`${tool.key}Label`)}</p>
              <p className="text-dark-slate/65" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{c(`${tool.key}Body`)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center" style={{ paddingTop: 4, paddingBottom: 20 }}>
        <Link href="/sandbox" className="inline-flex items-center justify-center bg-coral text-white font-semibold rounded-lg hover:bg-dark-slate transition-colors" style={{ padding: "13px 28px", fontSize: 15 }}>
          {c("cta")}
        </Link>
      </div>
    </div>
  );
}
