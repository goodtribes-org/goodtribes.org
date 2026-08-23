import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import Link from "next/link";
import { homeSansFont, showroomMonoFont } from "@/lib/fonts";

// Every tool listed here is a real, shipped feature (verified against the
// actual project-workspace routes and models) — this grid is a marketing
// overview, not a deep link, so every card points at /sandbox rather than a
// specific project's route.
const TOOLS = [
  { key: "leanCanvas", color: "coral", path: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 10h18M9 10v10" /></> },
  { key: "valueProposition", color: "seagrass", path: <><rect x="3" y="3" width="9" height="9" rx="1.5" /><circle cx="16.5" cy="16.5" r="4.5" /></> },
  { key: "whiteboard", color: "ink", path: <path d="M4 20l4.5-1.5L19 8a2 2 0 000-3l-1-1a2 2 0 00-3 0L4.5 14.5 3 20z" /> },
  { key: "kanban", color: "coral", path: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M9 4v16M15 4v16" /></> },
  { key: "funding", color: "seagrass", path: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /> },
  { key: "polls", color: "ink", path: <path d="M9 11l3 3L22 4M12 5H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" /> },
  { key: "tokens", color: "coral", path: <path d="M12 2l2.7 6.6 7.1.6-5.4 4.6 1.7 6.9-6.1-3.8-6.1 3.8 1.7-6.9-5.4-4.6 7.1-.6z" /> },
  { key: "sprints", color: "seagrass", path: <path d="M13 2L4 14h6l-1 8 9-12h-6z" /> },
  { key: "ideaSessions", color: "coral", path: <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.3.2.5.6.5 1v.6h6v-.6c0-.4.2-.8.5-1A6 6 0 0012 3z" /> },
  { key: "blog", color: "ink", path: <><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M8 9h8M8 13h8M8 17h5" /></> },
  { key: "wiki", color: "seagrass", path: <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z" /> },
  { key: "kanaler", color: "coral", path: <path d="M21 11.5a8.5 8.5 0 11-4.1-7.3L21 3l-1.2 4.1a8.4 8.4 0 011.2 4.4z" /> },
  { key: "calendar", color: "ink", path: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></> },
  { key: "files", color: "coral", path: <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /> },
  { key: "gantt", color: "seagrass", path: <path d="M4 6h8M4 12h12M4 18h6" /> },
] as const;

const COLOR_HEX: Record<string, string> = {
  coral: "var(--color-coral)",
  seagrass: "var(--color-seagrass)",
  ink: "var(--color-dark-slate)",
};

export default async function ToolsGrid({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "HomePage.tools" });

  return (
    <div className={`${homeSansFont.className} w-full`} style={{ background: "#fafaf8" }}>
      <div className="max-w-[1160px] mx-auto px-8" style={{ padding: "64px 32px 32px" }}>
        <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)" }}>
          {t("eyebrow").toUpperCase()}
        </p>
        <h2 className="text-dark-slate" style={{ fontSize: 30, lineHeight: 1.2, letterSpacing: "-.02em", marginTop: 10, maxWidth: "20ch" }}>
          {t("heading")}
        </h2>
        <p className="text-dark-slate/70" style={{ fontSize: 15, lineHeight: 1.6, marginTop: 10, maxWidth: "52ch" }}>
          {t("intro")}
        </p>
      </div>

      <div className="max-w-[1160px] mx-auto px-8" style={{ paddingBottom: 44 }}>
        <div className="grid gap-px bg-muted-teal/20 border border-muted-teal/20 rounded-[10px] overflow-hidden" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {TOOLS.map((tool) => (
            <div key={tool.key} className="bg-white flex flex-col" style={{ padding: 22, gap: 10 }}>
              <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 30, height: 30, background: `color-mix(in oklab, ${COLOR_HEX[tool.color]} 12%, white)` }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLOR_HEX[tool.color]} strokeWidth={2}>
                  {tool.path}
                </svg>
              </div>
              <p className="text-dark-slate" style={{ fontWeight: 600, fontSize: 14 }}>{t(`${tool.key}Label`)}</p>
              <p className="text-dark-slate/65" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{t(`${tool.key}Body`)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[1160px] mx-auto px-8 text-center" style={{ padding: "8px 32px 64px" }}>
        <Link href="/sandbox" className="inline-flex items-center justify-center bg-coral text-white font-semibold rounded-lg hover:bg-dark-slate transition-colors" style={{ padding: "13px 28px", fontSize: 15 }}>
          {t("cta")}
        </Link>
        <p className="text-dark-slate/45" style={{ fontSize: 12.5, marginTop: 14 }}>{t("reassurance")}</p>
      </div>
    </div>
  );
}
