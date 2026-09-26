import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import type { ProjectPhaseValue } from "@/lib/projectPhase";
import { newHomeDisplayFont } from "./fonts";

// Sections of the new start page (/ny-startsida), following the design
// proposal "Startsida – förslag med delar från gamla sidorna" (1440 px wide,
// 64 px side padding). Everything here is server rendered; only the dream
// box is a client component (DreamHero).

// Palette from the design.
export const INK = "#1B1F1D";
export const MUTED = "#4A514D";
export const SUBTLE = "#6B726E";
export const BORDER = "#E4E4DF";
export const LINK = "#C2410C";

// Same outer width and side padding as the design: 1312 px of content on a
// 1440 px screen.
export const wrap = "mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-16";
export const card = "rounded-[32px] border border-[#E4E4DF] bg-white";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 text-sm font-bold uppercase tracking-[.12em]" style={{ color: LINK }}>
      {children}
    </p>
  );
}

export function H2({ children, className = "", size = 52 }: { children: React.ReactNode; className?: string; size?: number }) {
  return (
    <h2
      className={`${newHomeDisplayFont.className} m-0 font-extrabold ${className}`}
      style={{ fontSize: `clamp(2rem, 4vw, ${size}px)`, lineHeight: 1.05, letterSpacing: "-0.03em", color: INK }}
    >
      {children}
    </h2>
  );
}

function SeeAll({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="shrink-0 text-[17px] font-semibold no-underline hover:text-[#9A3412]" style={{ color: LINK }}>
      {children}
    </Link>
  );
}

// Every module opens the same way: eyebrow and heading outside the card,
// optionally a short intro or a "see all" link on the right.
export function SectionHeader({ eyebrow, heading, intro, link }: { eyebrow: string; heading: string; intro?: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-12">
      <div className="flex flex-col gap-3">
        <Eyebrow>{eyebrow}</Eyebrow>
        <H2 className="max-w-[720px]">{heading}</H2>
      </div>
      {intro && <p className="m-0 max-w-[480px] text-lg leading-[1.6]" style={{ color: MUTED }}>{intro}</p>}
      {link && <SeeAll href={link.href}>{link.label}</SeeAll>}
    </div>
  );
}

// ─── 2. Live strip ────────────────────────────────────────────────────────

export async function LiveStrip({ locale, items }: { locale: Locale; items: { project: string; action: string }[] }) {
  const t = await getTranslations({ locale, namespace: "NewHomePage.live" });
  if (items.length === 0) return null;
  const track = [...items, ...items];
  return (
    <div className="mb-[72px] border-y border-[#E4E4DF] bg-white">
      <style>{`
        @keyframes nh-marq { to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: no-preference) { .nh-marq { animation: nh-marq 40s linear infinite; } }
      `}</style>
      <div className={`${wrap} flex h-16 items-center gap-6 text-[15px]`}>
        <span className="flex shrink-0 items-center gap-2 text-[13px] font-bold tracking-[.1em] text-[#1FA37A]">
          <span className="h-[9px] w-[9px] rounded-full bg-[#1FA37A]" />
          {t("label").toUpperCase()}
        </span>
        <div className="flex-grow overflow-hidden">
          <div className="nh-marq flex w-max">
            {track.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-3 whitespace-nowrap pr-10" aria-hidden={i >= items.length}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#F5B82E]" />
                <span className="font-semibold" style={{ color: INK }}>{item.project}</span>
                <span style={{ color: SUBTLE }}>{item.action}</span>
              </span>
            ))}
          </div>
        </div>
        <Link href="/feed" className="hidden shrink-0 font-semibold no-underline sm:inline" style={{ color: LINK }}>
          {t("allLink")}
        </Link>
      </div>
    </div>
  );
}

// ─── 4. Phase journey ─────────────────────────────────────────────────────

export type JourneyPhase = {
  value: Exclude<ProjectPhaseValue, "SPRINT">;
  label: string;
  count: number;
};

const PHASE_KEYS: Record<JourneyPhase["value"], string> = {
  IDEA: "idea",
  PILOT: "startup",
  PRODUCTION: "launch",
  ESTABLISH: "establish",
  SCALE: "scale",
  IMPACT: "impact",
};

// The design's warm-to-green scale, idea to impact.
const PHASE_BARS = ["#F5B82E", "#F29A2A", "#EE7A26", "#E8531F", "#1FA37A", "#0F7A55"];

export async function PhaseJourney({ locale, phases }: { locale: Locale; phases: JourneyPhase[] }) {
  const t = await getTranslations({ locale, namespace: "NewHomePage.phases" });
  return (
    <section id="resan" className={`${wrap} flex flex-col gap-9`}>
      <div className="flex flex-col gap-3">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <H2 className="max-w-[720px] sm:whitespace-nowrap">{t("heading")}</H2>
      </div>
      <div className={`${card} p-6 sm:p-10 lg:px-16 lg:py-14`}>
        <ol className="m-0 grid list-none gap-8 p-0 sm:grid-cols-2 lg:grid-cols-6 lg:gap-3.5">
          {phases.map((p, i) => (
            <li key={p.value} className="flex min-w-0 flex-col gap-3.5">
              <span className="h-2 rounded-full" style={{ background: PHASE_BARS[i] }} />
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[15px] font-semibold"
                  style={{ background: PHASE_BARS[i], color: "#FFFFFF" }}
                >
                  {i + 1}
                </span>
                <span className={`${newHomeDisplayFont.className} text-2xl font-bold tracking-[-0.01em]`} style={{ color: INK }}>
                  {p.label}
                </span>
              </div>
              <p className="m-0 text-base leading-normal" style={{ color: MUTED }}>{t(`descriptions.${PHASE_KEYS[p.value]}`)}</p>
              <p className="m-0 border-t border-dashed border-[#E4E4DF] pt-3.5 text-xs font-bold uppercase tracking-[.08em]" style={{ color: SUBTLE }}>
                {t("now", { count: p.count })}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ─── 5. Section headers for projects and ideas ────────────────────────────

export function ProjectsHeader({ eyebrow, heading, href, linkLabel }: { eyebrow: string; heading: string; href: string; linkLabel: string }) {
  return <SectionHeader eyebrow={eyebrow} heading={heading} link={{ href, label: linkLabel }} />;
}

export function IdeasHeader({ heading, sub, href, linkLabel }: { heading: string; sub: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-end justify-between gap-4 pt-10">
      <div className="flex flex-col gap-2">
        <h3 className={`${newHomeDisplayFont.className} m-0 text-[26px] font-extrabold tracking-[-0.02em] sm:text-[32px]`} style={{ color: INK }}>
          {heading}
        </h3>
        <p className="m-0 text-[17px]" style={{ color: MUTED }}>{sub}</p>
      </div>
      <SeeAll href={href}>{linkLabel}</SeeAll>
    </div>
  );
}

// ─── 6. Platform stats ────────────────────────────────────────────────────

export async function PlatformStats({
  locale, totalRaised, completedTasks, totalTokens, activeProjects,
}: {
  locale: Locale; totalRaised: number; completedTasks: number; totalTokens: number; activeProjects: number;
}) {
  const t = await getTranslations({ locale, namespace: "NewHomePage.stats" });
  const n = (v: number) => v.toLocaleString(locale === "sv" ? "sv-SE" : "en-GB");
  const tiles = [
    { value: `${n(totalRaised)} kr`, label: t("raised"), bg: "#FDE6DA", fg: "#9A3412" },
    { value: n(completedTasks), label: t("tasks"), bg: "#D8F2E7", fg: "#0F5B40" },
    { value: n(totalTokens), label: t("tokens"), bg: "#FCEFC7", fg: "#6B4510" },
    { value: n(activeProjects), label: t("projects"), bg: "#E4ECF5", fg: "#12486C" },
  ];
  return (
    <section className={`${wrap} flex flex-col gap-7 pt-[104px]`}>
      <SectionHeader eyebrow={t("eyebrow")} heading={t("heading")} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-1 rounded-[20px] p-[26px]" style={{ background: tile.bg }}>
            <p className={`${newHomeDisplayFont.className} m-0 font-extrabold leading-[1.05]`} style={{ color: tile.fg, fontSize: "clamp(1.6rem, 3vw, 40px)" }}>
              {tile.value}
            </p>
            <p className="m-0 text-[15px] text-[#3F4642]">{tile.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── 8. Tools ─────────────────────────────────────────────────────────────

const TOOL_KEYS = ["leanCanvas", "valueProposition", "whiteboard", "kanban", "funding", "polls", "rewards", "chatWiki"] as const;
const TOOL_COLORS = ["#F5B82E", "#F29A2A", "#EE7A26", "#E8531F", "#1FA37A", "#0F7A55", "#F5B82E", "#F29A2A"];

export async function ToolsRow({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "NewHomePage.tools" });
  return (
    <section className={`${wrap} flex flex-col gap-8 pt-[104px]`}>
      <SectionHeader eyebrow={t("eyebrow")} heading={t("heading")} intro={t("intro")} />
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {TOOL_KEYS.map((key, i) => (
          <div key={key} className="flex items-center gap-3 rounded-2xl border border-[#E4E4DF] bg-white px-5 py-[18px] text-[15px] font-semibold sm:text-[17px]" style={{ color: INK }}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: TOOL_COLORS[i] }} />
            {t(`items.${key}`)}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── 9. Closing ───────────────────────────────────────────────────────────

export async function Closing({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "NewHomePage.closing" });
  return (
    <section className={`${wrap} pt-[104px] pb-24`}>
      <div className={`${card} flex flex-col items-center gap-8 p-6 sm:p-10 lg:flex-row lg:gap-14 lg:px-[72px] lg:py-14`}>
        <img
          src="/img/want-to-be-a-winner.png"
          alt={t("imageAlt")}
          width={1920}
          height={1080}
          className="h-auto w-full shrink-0 rounded-[20px] object-cover lg:h-[260px] lg:w-[520px]"
        />
        <div className="flex flex-col items-start gap-[22px]">
          <H2 size={58}>
            {t("heading")} <span style={{ color: "var(--nh-accent)" }}>{t("headingHighlight")}</span>
          </H2>
          <p className="m-0 text-lg leading-[1.6]" style={{ color: MUTED }}>{t("body")}</p>
          <a
            href="#drom"
            className="inline-flex h-[58px] items-center gap-2.5 rounded-full px-7 text-lg font-semibold text-white no-underline"
            style={{ background: "var(--nh-accent)" }}
          >
            {t("cta")}
          </a>
        </div>
      </div>
    </section>
  );
}
