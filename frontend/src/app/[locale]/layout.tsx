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
      // ?v=2 busts the year-long immutable cache public/ files get in
      // production (see next's router-server.js) now that the mark changed —
      // bump this again on any future icon update.
      icon: [
        { url: "/icons/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
        { url: "/icons/favicon-16.png?v=2", sizes: "16x16", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" }],
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

  const [session, t, rawFooterPages] = await Promise.all([auth(), getTranslations("Footer"), getFooterPages()]);
  const canEditFooter = session?.user?.id ? await isSiteAdmin(session.user.id) : false;
  // Fixed pages (about/privacy/terms) keep their translated nav label
  // regardless of whatever H1 title is set on the page itself; only
  // footer-created custom pages use their own title as the link text.
  const footerPages = rawFooterPages.map((p) => ({
    ...p,
    title: p.locked ? t(p.slug as "about" | "privacy" | "terms") : p.title,
  }));

  return (
    <html lang={locale} className={`bg-white ${inter.className}`}>
      <body className="min-h-screen bg-white text-dark-slate flex flex-col">
        <NextIntlClientProvider>
          <SessionProvider session={session}>
          <UserEventsProvider enabled={!!session?.user}>
            <header className="border-b border-muted-teal shrink-0">
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
                  <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider text-seagrass border border-seagrass/40 rounded-full px-2 py-0.5">
                    Beta
                  </span>
                </Link>
                <div className="shrink-0">
                  <NavMenuContainer />
                </div>
                <div className="flex-1" />
                <SearchButton />
                {session?.user && <MessagesLink />}
                {session?.user && <NotificationBell />}
                {session?.user && <PresenceHeartbeat />}
                <AuthNav />
              </nav>
            </header>
            <main className="max-w-6xl mx-auto px-6 pt-8 pb-12 w-full flex-1 flex flex-col">{children}</main>
            <footer className="border-t border-muted-teal/30 bg-dry-sage/10 shrink-0">
              <div className="max-w-6xl mx-auto px-6 py-10 grid gap-8 md:grid-cols-2 text-sm">
                <div>
                  <Image
                    src="/img/goodtribes-logo.svg"
                    alt="GoodTribes.org"
                    height={50}
                    width={81}
                    unoptimized
                    className="object-contain mb-3"
                  />
                  <p className="text-dark-slate/60 leading-relaxed text-xs">{t("foundationBlurb")}</p>
                </div>
                <nav className="flex flex-col gap-1.5 text-xs text-dark-slate/60 justify-self-end">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="font-semibold text-dark-slate uppercase tracking-wider">{t("exploreTitle")}</p>
                    {canEditFooter && (
                      <FooterPageManager
                        pages={footerPages}
                        lockedLabels={[t("hallOfImpact"), t("shop"), t("academy"), t("dreamWall"), t("contact"), t("suggestions")]}
                      />
                    )}
                  </div>
                  <Link href="/hall-of-impact" className="hover:text-dark-slate transition-colors">{t("hallOfImpact")}</Link>
                  <Link href="/shop" className="hover:text-dark-slate transition-colors">{t("shop")}</Link>
                  <Link href="/academy" className="hover:text-dark-slate transition-colors">{t("academy")}</Link>
                  <Link href="/dream-wall" className="hover:text-dark-slate transition-colors">{t("dreamWall")}</Link>
                  {footerPages.map((p) => (
                    <Link key={p.slug} href={p.href} className="hover:text-dark-slate transition-colors">{p.title}</Link>
                  ))}
                  <a href="mailto:hej@goodtribes.org" className="hover:text-dark-slate transition-colors">{t("contact")}</a>
                  <Link href="/suggestions" className="hover:text-dark-slate transition-colors">{t("suggestions")}</Link>
                </nav>
              </div>
              <div className="border-t border-muted-teal/20">
                <p className="max-w-6xl mx-auto px-6 py-3 text-[11px] text-dark-slate/40">
                  © {new Date().getFullYear()} GoodTribes Foundation · {t("copyrightNote")}
                </p>
              </div>
            </footer>
          </UserEventsProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
