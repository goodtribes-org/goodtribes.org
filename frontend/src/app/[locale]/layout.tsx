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
import NavMenuContainer from "@/components/NavMenuContainer";
import InstallPrompt from "@/components/InstallPrompt";
import { auth } from "@/auth";

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
      images: [{ url: "/img/GoodTribes1.png", width: 800, height: 200, alt: "GoodTribes.org" }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/img/GoodTribes1.png"],
    },
    icons: {
      icon: [
        { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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

  const [session, t] = await Promise.all([auth(), getTranslations("Footer")]);

  return (
    <html lang={locale} className={`bg-white ${inter.className}`}>
      <body className="min-h-screen bg-white text-dark-slate">
        <NextIntlClientProvider>
          <SessionProvider session={session}>
            <header className="border-b border-muted-teal">
              <nav className="w-full pl-3 pr-6 py-3 flex items-center gap-6">
                <Link href="/" className="shrink-0">
                  <Image
                    src="/img/GoodTribes1.png"
                    alt="GoodTribes.org"
                    height={44}
                    width={176}
                    className="object-contain"
                  />
                </Link>
                <div className="shrink-0">
                  <NavMenuContainer />
                </div>
                <div className="flex-1" />
                <SearchButton />
                {session?.user && <NotificationBell />}
                <AuthNav />
              </nav>
            </header>
            <main className="max-w-6xl mx-auto px-6 pt-8 pb-12">{children}</main>
            <footer className="border-t border-muted-teal/30 mt-16">
              <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-xs text-dark-slate/40">
                <span>© {new Date().getFullYear()} GoodTribes Foundation</span>
                <div className="flex gap-5">
                  <Link href="/hall-of-impact" className="hover:text-dark-slate transition-colors">{t("hallOfImpact")}</Link>
                  <Link href="/academy" className="hover:text-dark-slate transition-colors">{t("academy")}</Link>
                  <Link href="/dream-wall" className="hover:text-dark-slate transition-colors">{t("dreamWall")}</Link>
                  <Link href="/about" className="hover:text-dark-slate transition-colors">{t("about")}</Link>
                  <Link href="/privacy" className="hover:text-dark-slate transition-colors">{t("privacy")}</Link>
                  <Link href="/terms" className="hover:text-dark-slate transition-colors">{t("terms")}</Link>
                  <a href="mailto:hej@goodtribes.org" className="hover:text-dark-slate transition-colors">{t("contact")}</a>
                </div>
              </div>
            </footer>
            <InstallPrompt />
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
