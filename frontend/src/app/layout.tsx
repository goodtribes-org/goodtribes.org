import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import AuthNav from "@/components/AuthNav";

export const metadata: Metadata = {
  title: "GoodTribes.org",
  description: "GoodTribes.org",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-yellow-100 text-dark-slate">
        <SessionProvider>
          <header className="border-b border-muted-teal">
            <nav className="max-w-4xl mx-auto px-6 py-4 flex gap-6 items-center">
              <Link href="/" className="font-semibold text-dark-slate hover:text-seagrass">
                GoodTribes.org
              </Link>
              <Link href="/about" className="text-dark-slate/70 hover:text-seagrass">
                Om oss
              </Link>
              <Link href="/projects" className="text-dark-slate/70 hover:text-seagrass">
                Projekt
              </Link>
              <Link href="/org" className="text-dark-slate/70 hover:text-seagrass">
                Organisationer
              </Link>
              <Link href="/members" className="text-dark-slate/70 hover:text-seagrass">
                Medlemmar
              </Link>
              <Link href="/links" className="text-dark-slate/70 hover:text-seagrass">
                Länkar
              </Link>
              <AuthNav />
              <Image
                src="/img/logga-icon.png"
                alt="GoodTribes.org"
                height={40}
                width={53}
                className="object-contain"
              />
            </nav>
          </header>
          <main className="max-w-4xl mx-auto px-6 py-12">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
