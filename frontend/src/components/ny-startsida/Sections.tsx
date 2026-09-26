import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import {
  ArrowRight, BarChart3, Coins, Gift, LayoutGrid, LayoutPanelLeft, Lightbulb, MessagesSquare, PenLine, Users, Globe,
} from "lucide-react";
import { PHASE_COLORS, type ProjectPhaseValue } from "@/lib/projectPhase";
import { newHomeDisplayFont } from "./fonts";

// Sections of the new start page (/ny-startsida). Everything is server
// rendered from data the page fetches; only the dream box is a client
// component (DreamHero).

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[.14em]" style={{ color: "var(--nh-accent)" }}>
      {children}
    </p>
  );
}

function Heading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2
      className={`${newHomeDisplayFont.className} font-bold tracking-tight text-[#1c1c1a] ${className}`}
      style={{ fontSize: "clamp(1.75rem, 3.4vw, 2.5rem)", lineHeight: 1.08, letterSpacing: "-0.025em" }}
    >
      {children}
    </h2>
  );
}

function SeeAll({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="shrink-0 text-sm font-semibold hover:underline" style={{ color: "var(--nh-accent)" }}>
      {children}
    </Link>
  );
}

export const card = "rounded-2xl border border-black/[.07] bg-white";

// ─── 2. Live strip ────────────────────────────────────────────────────────

export async function LiveStrip({ locale, items }: { locale: Locale; items: { project: string; action: string }[] }) {
  const t = await getTranslations({ locale, namespace: "NewHomePage.live" });
  if (items.length === 0) return null;
  const track = [...items, ...items];
  return (
    <div className="border-y border-black/[.07] bg-white">
      <style>{`
        @keyframes nh-live { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .nh-live-track { animation: nh-live 45s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .nh-live-track { animation: none; } }
      `}</style>
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#2f8f6f]">
          <span className="h-2 w-2 rounded-full bg-[#2f8f6f]" />
          {t("label")}
        </span>
        <div
          className="flex-1 overflow-hidden"
          style={{ maskImage: "linear-gradient(90deg, transparent, #000 24px, #000 calc(100% - 24px), transparent)" }}
        >
          <div className="nh-live-track inline-flex whitespace-nowrap text-sm">
            {track.map((item, i) => (
              <span key={i} className="mr-8 inline-flex items-center gap-2" aria-hidden={i >= items.length}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#f4b63f]" />
                <span className="font-semibold text-[#1c1c1a]">{item.project}</span>
                <span className="text-[#8a8a84]">{item.action}</span>
              </span>
            ))}
          </div>
        </div>
        <SeeAll href="/feed">{t("allLink")}</SeeAll>
      </div>
    </div>
  );
}

// ─── 3. Three promises ────────────────────────────────────────────────────

const PROMISES = [
  { key: "idea", icon: ArrowRight, bg: "#fde6dc", fg: "#E8531F" },
  { key: "together", icon: Users, bg: "#dff1ea", fg: "#2f8f6f" },
  { key: "nonprofit", icon: Globe, bg: "#fcefcf", fg: "#b7860b" },
] as const;

export async function Promises({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "NewHomePage.promises" });
  return (
    <section className="mx-auto grid max-w-6xl gap-5 px-4 py-14 md:grid-cols-3">
      {PROMISES.map(({ key, icon: Icon, bg, fg }) => (
        <div key={key} className={`${card} p-6`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: bg, color: fg }}>
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <h3 className={`${newHomeDisplayFont.className} mt-4 text-xl font-bold text-[#1c1c1a]`}>{t(`${key}.title`)}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-[#5b5b57]">{t(`${key}.body`)}</p>
        </div>
      ))}
    </section>
  );
}

// ─── 4. Phase journey ─────────────────────────────────────────────────────

export type JourneyPhase = {
  value: Exclude<ProjectPhaseValue, "SPRINT">;
  label: string;
  count: number;
  projects: { title: string; slug: string }[];
};

const PHASE_KEYS: Record<JourneyPhase["value"], string> = {
  IDEA: "idea",
  PILOT: "startup",
  PRODUCTION: "launch",
  ESTABLISH: "establish",
  SCALE: "scale",
  IMPACT: "impact",
};

export async function PhaseJourney({ locale, phases }: { locale: Locale; phases: JourneyPhase[] }) {
  const t = await getTranslations({ locale, namespace: "NewHomePage.phases" });
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14">
      <div className={`${card} p-6 sm:p-10`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <Heading className="max-w-md">{t("heading")}</Heading>
          <p className="max-w-sm text-[15px] leading-relaxed text-[#5b5b57]">{t("intro")}</p>
        </div>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
          {phases.map((p, i) => {
            const color = PHASE_COLORS[p.value];
            const rest = p.count - p.projects.length;
            return (
              <li key={p.value} className="flex flex-col">
                <span className="h-1 rounded-full" style={{ background: color }} />
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: color }}
                  >
                    {i + 1}
                  </span>
                  <span className={`${newHomeDisplayFont.className} font-bold text-[#1c1c1a]`}>{p.label}</span>
                </div>
                <p className="mt-2 text-sm leading-snug text-[#5b5b57]">{t(`descriptions.${PHASE_KEYS[p.value]}`)}</p>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[#a3a39d]">{t("now")}</p>
                <div className="mt-1.5 flex flex-col items-start gap-1">
                  {p.projects.length === 0 && <span className="text-xs text-[#a3a39d]">{t("empty")}</span>}
                  {p.projects.map((proj) => (
                    <Link
                      key={proj.slug}
                      href={`/projects/${proj.slug}`}
                      className="max-w-full truncate rounded-md bg-[#f1f1ee] px-2 py-0.5 text-xs text-[#3d3d39] hover:bg-[#e8e8e3]"
                    >
                      {proj.title}
                    </Link>
                  ))}
                  {rest > 0 && <span className="text-xs text-[#8a8a84]">{t("more", { count: rest })}</span>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ─── 5. Section header for projects and ideas ─────────────────────────────

export function ListHeader({
  eyebrow, heading, sub, href, linkLabel, small = false,
}: {
  eyebrow?: string; heading: string; sub?: string; href: string; linkLabel: string; small?: boolean;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {small ? (
          <h2 className={`${newHomeDisplayFont.className} mt-1 text-2xl font-bold tracking-tight text-[#1c1c1a]`}>{heading}</h2>
        ) : (
          <Heading className="mt-1">{heading}</Heading>
        )}
        {sub && <p className="mt-1 text-sm text-[#5b5b57]">{sub}</p>}
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
    { value: `${n(totalRaised)} kr`, label: t("raised"), bg: "#fde6dc", fg: "#c2410c" },
    { value: n(completedTasks), label: t("tasks"), bg: "#dff1ea", fg: "#1f7a5c" },
    { value: n(totalTokens), label: t("tokens"), bg: "#fcefcf", fg: "#946c05" },
    { value: n(activeProjects), label: t("projects"), bg: "#dde8f4", fg: "#2f6690" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <Heading className="mt-1 mb-6">{t("heading")}</Heading>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl px-5 py-5" style={{ background: tile.bg }}>
            <p className={`${newHomeDisplayFont.className} text-3xl font-extrabold`} style={{ color: tile.fg }}>
              {tile.value}
            </p>
            <p className="mt-1 text-sm text-[#3d3d39]">{tile.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── 8. Tools ─────────────────────────────────────────────────────────────

// Labels come from the old start page's tool grid (HomePage.tools), so the
// two pages always name the tools the same way.
const TOOLS = [
  { key: "leanCanvas", icon: LayoutGrid, dot: "#E8531F" },
  { key: "valueProposition", icon: Lightbulb, dot: "#2f8f6f" },
  { key: "whiteboard", icon: PenLine, dot: "#f4b63f" },
  { key: "kanban", icon: LayoutPanelLeft, dot: "#2f6690" },
  { key: "funding", icon: Coins, dot: "#E8531F" },
  { key: "polls", icon: BarChart3, dot: "#2f8f6f" },
  { key: "tokens", icon: Gift, dot: "#f4b63f" },
  { key: "kanaler", icon: MessagesSquare, dot: "#2f6690" },
] as const;

export async function ToolsRow({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "NewHomePage.tools" });
  const tt = await getTranslations({ locale, namespace: "HomePage.tools" });
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Heading className="mt-1">{t("heading")}</Heading>
        </div>
        <p className="max-w-sm text-[15px] leading-relaxed text-[#5b5b57]">{t("intro")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {TOOLS.map(({ key, icon: Icon, dot }) => (
          <div key={key} className={`${card} flex items-center gap-3 px-4 py-3`}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />
            <Icon className="h-4 w-4 shrink-0 text-[#8a8a84]" strokeWidth={2} />
            <span className="truncate text-sm font-semibold text-[#1c1c1a]">{tt(`${key}Label`)}</span>
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
    <section className="mx-auto max-w-6xl px-4 pb-20">
      <div className={`${card} grid items-center gap-8 overflow-hidden p-6 sm:p-10 md:grid-cols-2`}>
        <img
          src="/img/want-to-be-a-winner.png"
          alt={t("imageAlt")}
          width={1920}
          height={1080}
          className="w-full rounded-xl object-cover"
        />
        <div>
          <h2
            className={`${newHomeDisplayFont.className} font-extrabold tracking-tight text-[#1c1c1a]`}
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.02, letterSpacing: "-0.03em" }}
          >
            {t("heading")} <span style={{ color: "var(--nh-accent)" }}>{t("headingHighlight")}</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#5b5b57]">{t("body")}</p>
          <a
            href="#drom"
            className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: "var(--nh-accent)" }}
          >
            {t("cta")} <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </a>
        </div>
      </div>
    </section>
  );
}
