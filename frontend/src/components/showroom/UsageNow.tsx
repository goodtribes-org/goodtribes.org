import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { homeSansFont, showroomMonoFont } from "@/lib/fonts";

// Goal-first examples of the platform's own tools (see ToolsGrid.tsx for
// the full catalog) -- deliberately NOT real project data. This section
// used to show actual live projects under the heading "Riktiga initiativ,
// inte påhittade exempel", which read as defensive ("look, these aren't
// fake!") precisely because it had to say so. Framing it as "here's what
// you can do" sidesteps that entirely -- it's honestly a usage example,
// not a claim about authenticity.
const EXAMPLES = [
  { key: "leanCanvas", color: "coral", path: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 10h18M9 10v10" /></> },
  { key: "crowdfunding", color: "seagrass", path: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /> },
  { key: "polls", color: "ink", path: <path d="M9 11l3 3L22 4M12 5H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" /> },
  { key: "kanban", color: "coral", path: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M9 4v16M15 4v16" /></> },
  { key: "tokens", color: "seagrass", path: <path d="M12 2l2.7 6.6 7.1.6-5.4 4.6 1.7 6.9-6.1-3.8-6.1 3.8 1.7-6.9-5.4-4.6 7.1-.6z" /> },
  { key: "ideaSessions", color: "ink", path: <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.3.2.5.6.5 1v.6h6v-.6c0-.4.2-.8.5-1A6 6 0 0012 3z" /> },
] as const;

const COLOR_HEX: Record<string, string> = {
  coral: "var(--color-coral)",
  seagrass: "var(--color-seagrass)",
  ink: "var(--color-dark-slate)",
};

export default async function UsageNow({ locale, copy }: { locale: Locale; copy: Record<string, string> }) {
  const t = await getTranslations({ locale, namespace: "HomePage.usageNow" });
  const c = (key: string) => copy[`HomePage.usageNow.${key}`] ?? t(key);

  return (
    <div className={`${homeSansFont.className} max-w-[1160px] mx-auto px-8`} style={{ padding: "56px 32px" }}>
      <div style={{ marginBottom: 32 }}>
        <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)" }}>
          {c("eyebrow").toUpperCase()}
        </p>
        <h2 className="text-dark-slate" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.01em", marginTop: 8 }}>
          {c("heading")}
        </h2>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {EXAMPLES.map((ex) => (
          <div
            key={ex.key}
            className="bg-white border border-muted-teal/35 rounded-xl flex flex-col"
            style={{ padding: 20, gap: 8 }}
          >
            <div className="flex items-center" style={{ gap: 8 }}>
              <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 26, height: 26, background: `color-mix(in oklab, ${COLOR_HEX[ex.color]} 12%, white)` }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={COLOR_HEX[ex.color]} strokeWidth={2}>
                  {ex.path}
                </svg>
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: COLOR_HEX[ex.color] }}>{c(`${ex.key}Tool`)}</p>
            </div>
            <p className="text-dark-slate" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{c(`${ex.key}Goal`)}</p>
            <p className="text-dark-slate/65" style={{ fontSize: 13, lineHeight: 1.5 }}>{c(`${ex.key}Body`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
