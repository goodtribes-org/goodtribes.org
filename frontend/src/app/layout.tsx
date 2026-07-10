import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
import SessionProvider from "@/components/SessionProvider";
import AuthNav from "@/components/AuthNav";
import SearchButton from "@/components/SearchButton";
import NotificationBell from "@/components/NotificationBell";
import NavMenuContainer from "@/components/NavMenuContainer";
import { auth } from "@/auth";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";

export const metadata: Metadata = {
  title: {
    default: "GoodTribes.org",
    template: "%s — GoodTribes.org",
  },
  description: "Connecting skilled volunteers with impact-driven organisations to build a better world together.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    siteName: "GoodTribes.org",
    type: "website",
    locale: "en_US",
    title: "GoodTribes.org — Collaborative Impact Platform",
    description: "Connecting skilled volunteers with impact-driven organisations to build a better world together.",
    url: APP_URL,
    images: [{ url: "/img/GoodTribes1.png", width: 800, height: 200, alt: "GoodTribes.org" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GoodTribes.org",
    description: "Connecting skilled volunteers with impact-driven organisations.",
    images: ["/img/GoodTribes1.png"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="en" className={`bg-white ${inter.className}`}>
      <body className="min-h-screen bg-white text-dark-slate">
        <SessionProvider session={session}>
          <header className="border-b border-muted-teal">
            <nav className="w-full px-6 py-3 flex items-center gap-6">
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
              <NotificationBell />
              <AuthNav />
            </nav>
          </header>
          <main className="max-w-6xl mx-auto px-6 pt-8 pb-12">{children}</main>
          <footer className="border-t border-muted-teal/30 mt-16">
            <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-xs text-dark-slate/40">
              <span>© {new Date().getFullYear()} GoodTribes Foundation</span>
              <div className="flex gap-5">
                <Link href="/hall-of-impact" className="hover:text-dark-slate transition-colors">Hall of Impact</Link>
                <Link href="/academy" className="hover:text-dark-slate transition-colors">Academy</Link>
                <Link href="/dream-wall" className="hover:text-dark-slate transition-colors">Drömväggen</Link>
                <Link href="/about" className="hover:text-dark-slate transition-colors">About</Link>
                <Link href="/privacy" className="hover:text-dark-slate transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-dark-slate transition-colors">Terms</Link>
                <a href="mailto:hej@goodtribes.org" className="hover:text-dark-slate transition-colors">Contact</a>
              </div>
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
