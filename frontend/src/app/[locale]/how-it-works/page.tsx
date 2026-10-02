import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { isSiteAdmin } from "@/lib/authz";
import { getSitePage } from "@/lib/sitePages";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { DEFAULT_SITE_PAGES } from "@/lib/defaultSitePages";
import { sitePageBlocks, stripNumber, type SitePageBlock } from "@/lib/sitePageBlocks";
import { PHASE_COLORS, type ProjectPhaseValue } from "@/lib/projectPhase";
import EditableSitePage from "@/components/EditableSitePage";
import { buildMetadata } from "@/lib/metadata";

// "Så fungerar det": what GoodTribes is and the six phases a project goes
// through. The text is a SitePage, edited in place with the site-admin
// pencil like /about, and laid out from its structure (sitePageBlocks):
// the opening text, each h3 as a numbered card, a blockquote as a box, the
// short sections at the end side by side. "Tre sätt att vara med" and the
// buttons are links into the app, so they stay in code. Linked from the
// menu, the help panel's "Kom igång" and the start page's phase cards,
// which point at the phase anchors below.

// Phase heading text (either language, numbering ignored) → fixed anchor.
const HOW_IT_WORKS_ANCHORS: Record<string, string> = {
  ide: "idea", idea: "idea",
  uppstart: "startup", "start-up": "startup",
  lansering: "launch", launch: "launch",
  etablera: "establish", establish: "establish",
  skala: "scale", scale: "scale",
  impact: "impact",
};
const ANCHOR_PHASE: Record<string, ProjectPhaseValue> = {
  idea: "IDEA", startup: "PILOT", launch: "PRODUCTION", establish: "ESTABLISH", scale: "SCALE", impact: "IMPACT",
};

const WAYS = [
  { key: "start", href: "/projects/new" },
  { key: "join", href: "/projects" },
  { key: "idea", href: "/ideas/new" },
] as const;

const BASE = "text-dark-slate/75 [&_a]:text-coral hover:[&_a]:underline [&_p+p]:mt-3 [&_strong]:text-dark-slate";
const TEXT = `${BASE} [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5`;
const STEPS =
  "[&_ul]:mt-3 [&_ul]:flex [&_ul]:list-none [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:p-0 [&_ul]:text-sm [&_ul]:text-dark-slate/80 [&_li]:before:mr-1.5 [&_li]:before:content-['✓']";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HowItWorks" });
  return buildMetadata({ locale, path: "/how-it-works", title: t("pageTitle"), description: t("description") });
}

type Group =
  | { kind: "text"; html: string; first: boolean }
  | { kind: "callout"; html: string }
  | { kind: "section"; id: string; title: string; html: string }
  | { kind: "cards"; cards: { id: string; title: string; html: string }[] }
  | { kind: "columns"; sections: { id: string; title: string; html: string }[] };

// Consecutive cards become one numbered list; the sections
// after the last card or box sit side by side, like the first design.
function group(blocks: SitePageBlock[]): Group[] {
  const lastCardOrBox = blocks.reduce((at, b, i) => (b.kind === "card" || b.kind === "callout" ? i : at), -1);
  const out: Group[] = [];
  blocks.forEach((b, i) => {
    const prev = out[out.length - 1];
    if (b.kind === "card") {
      if (prev?.kind === "cards") prev.cards.push(b);
      else out.push({ kind: "cards", cards: [b] });
    } else if (b.kind === "section" && lastCardOrBox >= 0 && i > lastCardOrBox) {
      if (prev?.kind === "columns") prev.sections.push(b);
      else out.push({ kind: "columns", sections: [b] });
    } else if (b.kind === "section") {
      out.push(b);
    } else if (b.kind === "text") {
      out.push({ ...b, first: i === 0 });
    } else {
      out.push(b);
    }
  });
  return out;
}

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [session, t] = await Promise.all([auth(), getTranslations({ locale, namespace: "HowItWorks" })]);
  const canEdit = session?.user?.id ? await isSiteAdmin(session.user.id) : false;
  const page = (await getSitePage("how-it-works", locale)) ?? DEFAULT_SITE_PAGES["how-it-works"][locale];
  const groups = group(sitePageBlocks(page.body, HOW_IT_WORKS_ANCHORS));

  const ways = (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-dark-slate">{t("waysHeading")}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {WAYS.map((w) => (
          <Link key={w.key} href={w.href} className="flex flex-col rounded-2xl border border-muted-teal/40 bg-white p-4 hover:border-seagrass/60">
            <span className="font-semibold text-dark-slate">{t(`ways.${w.key}.title`)}</span>
            <span className="mt-1 flex-1 text-sm text-dark-slate/70">{t(`ways.${w.key}.text`)}</span>
            <span className="mt-3 text-sm font-semibold text-seagrass">{t(`ways.${w.key}.cta`)}</span>
          </Link>
        ))}
      </div>
    </section>
  );

  const display = (
    <div>
      {groups.map((g, i) => {
        if (g.kind === "text") {
          return (
            <div key={i}>
              <div className={g.first ? `text-lg ${TEXT}` : `mt-4 ${TEXT}`} dangerouslySetInnerHTML={{ __html: g.html }} />
              {g.first && ways}
            </div>
          );
        }
        if (g.kind === "callout") {
          return <div key={i} className={`mt-4 rounded-xl bg-dry-sage/20 p-4 text-sm ${TEXT}`} dangerouslySetInnerHTML={{ __html: g.html }} />;
        }
        if (g.kind === "section") {
          return (
            <section key={i} className="mt-12">
              <h2 id={g.id} className="scroll-mt-24 text-xl font-bold text-dark-slate">{g.title}</h2>
              <div className={`mt-2 ${TEXT}`} dangerouslySetInnerHTML={{ __html: g.html }} />
            </section>
          );
        }
        if (g.kind === "cards") {
          return (
            <ol key={i} className="mt-6 flex list-none flex-col gap-4 p-0">
              {g.cards.map((c, n) => (
                <li key={c.id || n} id={c.id} className="scroll-mt-24 rounded-2xl border border-muted-teal/40 bg-white">
                  <div className="flex gap-4 p-5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                      style={{ background: ANCHOR_PHASE[c.id] ? PHASE_COLORS[ANCHOR_PHASE[c.id]] : "var(--color-seagrass)" }}
                    >
                      {n + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-dark-slate">{stripNumber(c.title)}</h3>
                      <div className={`mt-1 ${BASE} ${STEPS}`} dangerouslySetInnerHTML={{ __html: c.html }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <section key={i} className="mt-12 grid gap-6 sm:grid-cols-2">
            {g.sections.map((s) => (
              <div key={s.id}>
                <h2 id={s.id} className="scroll-mt-24 text-xl font-bold text-dark-slate">{s.title}</h2>
                <div className={`mt-2 ${TEXT}`} dangerouslySetInnerHTML={{ __html: s.html }} />
              </div>
            ))}
          </section>
        );
      })}
      {groups[0]?.kind !== "text" && ways}

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/projects/new" className="rounded-full bg-seagrass px-5 py-2.5 text-sm font-semibold text-white hover:bg-seagrass/90">{t("ctaStart")}</Link>
        <Link href="/projects" className="rounded-full border border-muted-teal/50 bg-white px-5 py-2.5 text-sm font-semibold text-dark-slate hover:border-seagrass/60">{t("ctaBrowse")}</Link>
      </div>
    </div>
  );

  return (
    <EditableSitePage
      slug="how-it-works"
      locale={locale}
      canEdit={canEdit}
      title={page.title}
      body={sanitizeHtml(page.body)}
      titleClassName="text-3xl font-extrabold tracking-tight"
      className="mx-auto max-w-3xl px-4 py-10"
      display={display}
    />
  );
}
