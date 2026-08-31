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
    <html lang={locale} className={`bg-[#f6f5f2] ${inter.className}`}>
      <body className="min-h-screen bg-[#f6f5f2] text-dark-slate flex flex-col">
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
              <nav className="relative w-full pl-3 pr-6 py-3 flex items-center gap-6">
                <Link href="/" className="shrink-0 flex items-center gap-2.5">
                  <Image
                    src="/img/goodtribes-logo.svg"
                    alt="GoodTribes.org"
                    height={60}
                    width={98}
                    unoptimized
                    className="object-contain"
                  />
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
              <div className="max-w-6xl mx-auto px-6 pt-12 pb-10">
                <div className="flex items-center justify-center gap-4 mb-12">
                  <Image
                    src="/img/goodtribes-logo.svg"
                    alt="GoodTribes.org"
                    height={90}
                    width={146}
                    unoptimized
                    className="object-contain"
                  />
                  <h2 className="text-dark-slate font-semibold" style={{ fontSize: "clamp(20px,2.6vw,34px)", letterSpacing: "-.01em", whiteSpace: "nowrap" }}>
                    Vi gör goda drömmar <span style={{ color: "var(--color-coral)" }}>verkliga</span>.
                  </h2>
                </div>

                <div className="grid gap-10 md:grid-cols-4 text-sm text-center">
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 26, height: 26, background: "var(--color-leaf)" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20s-7-4.4-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.6-9 9-9 9z" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-dark-slate uppercase tracking-wider">Stiftelsen GoodTribes</p>
                    </div>
                    <p className="text-dark-slate/60 leading-relaxed text-[13px]" style={{ marginTop: 8 }}>{t("foundationBlurb")}</p>
                  </div>

                  {/* Organisational transparency info (Google for Nonprofits requirement) —
                      locale-invariant facts, hardcoded like the mailto link above rather
                      than run through t(), same as this file's existing convention. */}
                  <div className="flex flex-col items-center gap-2 text-xs text-dark-slate/60">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 26, height: 26, background: "var(--color-navy)" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 21V9l8-6 8 6v12M9 21v-7h6v7" />
                        </svg>
                      </div>
                      <p className="font-semibold text-dark-slate uppercase tracking-wider">{t("contactDetailsTitle")}</p>
                    </div>
                    <p>Stiftelsen GoodTribes</p>
                    <p>Org.nr 802481-8497</p>
                    <p>Högbergsgatan 52</p>
                    <p>118 26 Stockholm</p>
                    <p>Sverige</p>
                    <a href="mailto:Info@goodtribes.org" className="underline hover:text-dark-slate transition-colors">
                      Info@goodtribes.org
                    </a>
                  </div>

                  <nav className="flex flex-col items-center gap-2 text-xs text-dark-slate/60">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 26, height: 26, background: "var(--color-coral)" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <rect x="4" y="4" width="16" height="16" rx="1" /><path d="M8 9h8M8 13h8M8 17h5" />
                        </svg>
                      </div>
                      <p className="font-semibold text-dark-slate uppercase tracking-wider">{t("organisationTitle")}</p>
                    </div>
                    {organisationPages.map((p) => (
                      <Link key={p.slug} href={p.href} className="hover:text-coral transition-colors">{p.title}</Link>
                    ))}
                    <a href="mailto:Info@goodtribes.org" className="hover:text-coral transition-colors">{t("contact")}</a>
                  </nav>

                  <nav className="flex flex-col items-center gap-2 text-xs text-dark-slate/60">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 26, height: 26, background: "var(--color-seagrass)" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2l2.7 6.6 7.1.6-5.4 4.6 1.7 6.9-6.1-3.8-6.1 3.8 1.7-6.9-5.4-4.6 7.1-.6z" />
                        </svg>
                      </div>
                      <p className="font-semibold text-dark-slate uppercase tracking-wider">{t("servicesTitle")}</p>
                      {canEditFooter && (
                        <FooterPageManager
                          pages={footerPages}
                          lockedLabels={[t("hallOfImpact"), t("academy"), t("dreamWall"), t("contact"), t("suggestions")]}
                          locale={locale as Locale}
                        />
                      )}
                    </div>
                    <Link href="/hall-of-impact" className="hover:text-seagrass transition-colors">{t("hallOfImpact")}</Link>
                    <Link href="/academy" className="hover:text-seagrass transition-colors">{t("academy")}</Link>
                    <Link href="/dream-wall" className="hover:text-seagrass transition-colors">{t("dreamWall")}</Link>
                    {customFooterPages.map((p) => (
                      <Link key={p.slug} href={p.href} className="hover:text-seagrass transition-colors">{p.title}</Link>
                    ))}
                    <Link href="/suggestions" className="hover:text-seagrass transition-colors">{t("suggestions")}</Link>
                  </nav>
                </div>
              </div>
              <div className="border-t border-muted-teal/20">
                <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] text-dark-slate/40">
                  <p>© {new Date().getFullYear()} GoodTribes Foundation · {t("copyrightNote")}</p>
                  <a
                    href="#top"
                    className="inline-flex items-center justify-center rounded-full transition-colors flex-shrink-0"
                    style={{ width: 26, height: 26, background: "var(--color-coral)", color: "white" }}
                    aria-label={t("backToTop")}
                  >
                    ↑
                  </a>
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
