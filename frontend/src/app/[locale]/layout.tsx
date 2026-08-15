import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { hasLocale, type Locale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import SessionProvider from "@/components/SessionProvider";
import AuthNav from "@/components/AuthNav";
import SearchButton from "@/components/SearchButton";
import NotificationBell from "@/components/NotificationBell";
import MessagesLink from "@/components/MessagesLink";
import PresenceHeartbeat from "@/components/PresenceHeartbeat";
import UserEventsProvider from "@/components/UserEventsProvider";
import NavMenuContainer from "@/components/NavMenuContainer";
import FooterPageManager from "@/components/FooterPageManager";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import ConsentGate from "@/components/ConsentGate";
import SandboxBetaBadge from "@/components/SandboxBetaBadge";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { SandboxProvider } from "@/components/SandboxIndicator";
import { auth } from "@/auth";
import { isSiteAdmin } from "@/lib/authz";
import { getFooterPages } from "@/lib/sitePages";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

const APP_URL = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: {
      default: t("title"),
      template: `%s — ${t("title")}`,
    },
    description: t("description"),
    metadataBase: new URL(APP_URL),
    openGraph: {
      siteName: "GoodTribes.org",
      type: "website",
      locale,
      title: t("title"),
      description: t("description"),
      url: APP_URL,
      images: [{ url: "/img/goodtribes-logo.svg", width: 2000, height: 1231, alt: "GoodTribes.org" }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/img/goodtribes-logo.svg"],
    },
    icons: {
      // ?v=N busts the year-long immutable cache public/ files get in
      // production (see next's router-server.js) — bump the number on any
      // future icon content update, even though the filename stays the same.
      icon: [
        // SVG first: browsers that support it (Chrome, Firefox, Edge) use this
        // crisp vector at any zoom/DPI instead of the PNGs below, which stay
        // as the fallback for Safari and older browsers with no SVG support.
        { url: "/img/goodtribes-mark.svg", type: "image/svg+xml" },
        { url: "/icons/favicon-32.png?v=4", sizes: "32x32", type: "image/png" },
        { url: "/icons/favicon-16.png?v=4", sizes: "16x16", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png?v=4", sizes: "180x180", type: "image/png" }],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#254441",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale as Locale);

  const [session, t, rawFooterPages] = await Promise.all([auth(), getTranslations("Footer"), getFooterPages(locale as Locale)]);
  const canEditFooter = session?.user?.id ? await isSiteAdmin(session.user.id) : false;
  // Fixed pages (about/privacy/terms) keep their translated nav label
  // regardless of whatever H1 title is set on the page itself; only
  // footer-created custom pages use their own title as the link text.
  const footerPages = rawFooterPages.map((p) => ({
    ...p,
    title: p.locked ? t(p.slug as "about" | "privacy" | "terms" | "participant-agreement" | "code-of-conduct") : p.title,
  }));
  // Split into two footer columns: the fixed about/privacy/terms pages read
  // as organisational/legal info, custom admin-added pages read as more
  // product-ish content alongside the other feature links — the underlying
  // reorder list in FooterPageManager stays a single flat list either way,
  // this split is purely how it's grouped for display.
  const organisationPages = footerPages.filter((p) => p.locked);
  const customFooterPages = footerPages.filter((p) => !p.locked);

  // Organisation/NGO structured data (schema.org) — locale-invariant facts about the
  // foundation itself, same convention as the hardcoded org info in the footer below.
  // Next.js doesn't require this to live inside a literal <head>; crawlers parse JSON-LD
  // anywhere in the document. Improves rich-result eligibility and nonprofit verification
  // (e.g. Google for Nonprofits) since none of this was previously machine-readable.
  const organisationJsonLd = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: "GoodTribes Foundation",
    alternateName: "GoodTribes.org",
    url: APP_URL,
    logo: `${APP_URL}/img/goodtribes-logo.svg`,
    email: "Info@goodtribes.org",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Högbergsgatan 52",
      postalCode: "118 26",
      addressLocality: "Stockholm",
      addressCountry: "SE",
    },
    identifier: "802481-8497",
  };

  return (
    <html lang={locale} className={`bg-white ${inter.className}`}>
      <body className="min-h-screen bg-white text-dark-slate flex flex-col">
        {/* Static, locally-constructed object — no user input reaches this __html. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd) }}
        />
        <NextIntlClientProvider>
          <SessionProvider session={session}>
          <UserEventsProvider enabled={!!session?.user}>
          <SandboxProvider>
            <ConsentGate needsAgreementConsent={!!session?.user?.needsAgreementConsent} />
            <SiteHeader>
              <nav className="w-full pl-3 pr-6 py-3 flex items-center gap-6">
                <Link href="/" className="shrink-0 flex items-center gap-2.5">
                  <Image
                    src="/img/goodtribes-logo.svg"
                    alt="GoodTribes.org"
                    height={60}
                    width={98}
                    unoptimized
                    className="object-contain"
                  />
                  <SandboxBetaBadge />
                </Link>
                <div className="shrink-0">
                  <NavMenuContainer />
                </div>
                <div className="flex-1" />
                <LocaleSwitcher />
                <SearchButton />
                {session?.user && <MessagesLink />}
                {session?.user && <NotificationBell />}
                {session?.user && <PresenceHeartbeat />}
                <AuthNav />
              </nav>
            </SiteHeader>
            <main className="max-w-6xl mx-auto px-6 pt-8 pb-12 w-full flex-1 flex flex-col">{children}</main>
            <SiteFooter>
              <div className="max-w-6xl mx-auto px-6 py-10 grid gap-16 md:grid-cols-[3fr_5fr] text-sm">
                <div>
                  {/* -mt compensates for transparent padding baked into the top of the
                      logo SVG's own viewBox, so the visible mark lines up with the
                      heading text at the top of the other columns instead of sitting
                      visually lower. */}
                  <div className="flex justify-center mb-3 -mt-[13px]">
                    <Image
                      src="/img/goodtribes-logo.svg"
                      alt="GoodTribes.org"
                      height={96}
                      width={155}
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                  <p className="text-dark-slate/60 leading-relaxed text-[13px]">{t("foundationBlurb")}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {/* Organisational transparency info (Google for Nonprofits requirement) —
                      locale-invariant facts, hardcoded like the mailto link above rather
                      than run through t(), same as this file's existing convention. */}
                  <div className="flex flex-col gap-1.5 text-xs text-dark-slate/60">
                    <p className="font-semibold text-dark-slate uppercase tracking-wider">Stiftelsen GoodTribes</p>
                    <p>Org.nr 802481-8497</p>
                    <p>Högbergsgatan 52</p>
                    <p>118 26 Stockholm</p>
                    <p>Sverige</p>
                    <a href="mailto:Info@goodtribes.org" className="hover:text-dark-slate transition-colors underline">
                      Info@goodtribes.org
                    </a>
                  </div>
                  <nav className="flex flex-col gap-1.5 text-xs text-dark-slate/60">
                    <p className="font-semibold text-dark-slate uppercase tracking-wider">{t("organisationTitle")}</p>
                    {organisationPages.map((p) => (
                      <Link key={p.slug} href={p.href} className="hover:text-dark-slate transition-colors">{p.title}</Link>
                    ))}
                    <a href="mailto:Info@goodtribes.org" className="hover:text-dark-slate transition-colors">{t("contact")}</a>
                  </nav>
                  <nav className="flex flex-col gap-1.5 text-xs text-dark-slate/60">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-dark-slate uppercase tracking-wider">{t("servicesTitle")}</p>
                      {canEditFooter && (
                        <FooterPageManager
                          pages={footerPages}
                          lockedLabels={[t("hallOfImpact"), t("academy"), t("dreamWall"), t("contact"), t("suggestions")]}
                          locale={locale as Locale}
                        />
                      )}
                    </div>
                    <Link href="/hall-of-impact" className="hover:text-dark-slate transition-colors">{t("hallOfImpact")}</Link>
                    <Link href="/academy" className="hover:text-dark-slate transition-colors">{t("academy")}</Link>
                    <Link href="/dream-wall" className="hover:text-dark-slate transition-colors">{t("dreamWall")}</Link>
                    {customFooterPages.map((p) => (
                      <Link key={p.slug} href={p.href} className="hover:text-dark-slate transition-colors">{p.title}</Link>
                    ))}
                    <Link href="/suggestions" className="hover:text-dark-slate transition-colors">{t("suggestions")}</Link>
                  </nav>
                </div>
              </div>
              <div className="border-t border-muted-teal/20">
                <div className="max-w-6xl mx-auto px-6 py-3 text-[11px] text-dark-slate/40">
                  <p>© {new Date().getFullYear()} GoodTribes Foundation · {t("copyrightNote")}</p>
                </div>
              </div>
            </SiteFooter>
          </SandboxProvider>
          </UserEventsProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
