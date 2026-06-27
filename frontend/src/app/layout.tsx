import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import AuthNav from "@/components/AuthNav";
import SearchInput from "@/components/SearchInput";
import NotificationBell from "@/components/NotificationBell";
import NavMenu from "@/components/NavMenu";
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
    <html lang="en" className="bg-white">
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
              <div className="shrink-0" style={{ marginLeft: "max(0px, calc(50vw - 48.5rem))" }}>
                <NavMenu />
              </div>
              <div className="flex-1" />
              <div className="hidden md:block shrink-0">
                <SearchInput />
              </div>
              {/* Spacer that grows to align search right edge with content container right edge */}
              <div className="shrink-0 hidden md:block" style={{ width: "max(0px, calc((100vw - 72rem) / 2 - 17.625rem))" }} />
              <NotificationBell />
              <AuthNav />
            </nav>
          </header>
          <main className="max-w-6xl mx-auto px-6 pt-8 pb-12">{children}</main>
          <footer className="border-t border-muted-teal/30 mt-16">
            <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-xs text-dark-slate/40">
              <span>© {new Date().getFullYear()} GoodTribes Foundation</span>
              <div className="flex gap-5">
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
