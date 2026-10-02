import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { isSiteAdmin } from "@/lib/authz";
import { getSitePage } from "@/lib/sitePages";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { DEFAULT_SITE_PAGES } from "@/lib/defaultSitePages";
import { addHeadingIds } from "@/lib/headingAnchors";
import EditableSitePage from "@/components/EditableSitePage";
import { buildMetadata } from "@/lib/metadata";

// "Så fungerar det": what GoodTribes is and the six phases a project goes
// through. The text is a SitePage, edited in place with the site-admin
// pencil like /about; the "Tre sätt att vara med" cards below it are links
// into the app, so they stay in code. Linked from the menu, the help
// panel's "Kom igång" and the start page's phase cards, which point at the
// phase anchors below.
// Phase heading text (either language, numbering ignored) → fixed anchor.
const HOW_IT_WORKS_ANCHORS: Record<string, string> = {
  ide: "idea", idea: "idea",
  uppstart: "startup", "start-up": "startup",
  lansering: "launch", launch: "launch",
  etablera: "establish", establish: "establish",
  skala: "scale", scale: "scale",
  impact: "impact",
};

const WAYS = [
  { key: "start", href: "/projects/new" },
  { key: "join", href: "/projects" },
  { key: "idea", href: "/ideas/new" },
] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HowItWorks" });
  return buildMetadata({ locale, path: "/how-it-works", title: t("pageTitle"), description: t("description") });
}

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [session, t] = await Promise.all([auth(), getTranslations({ locale, namespace: "HowItWorks" })]);
  const canEdit = session?.user?.id ? await isSiteAdmin(session.user.id) : false;
  const page = (await getSitePage("how-it-works", locale)) ?? DEFAULT_SITE_PAGES["how-it-works"][locale];

  return (
    <div className="[&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24">
      <EditableSitePage
        slug="how-it-works"
        locale={locale}
        canEdit={canEdit}
        title={page.title}
        body={addHeadingIds(sanitizeHtml(page.body), HOW_IT_WORKS_ANCHORS)}
        titleClassName="text-4xl"
      />

      <section className="mt-10 max-w-2xl pb-10">
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
    </div>
  );
}
