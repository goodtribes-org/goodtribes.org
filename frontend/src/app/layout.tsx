import type { Metadata } from "next";
import Link from "next/link";
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
      <body className="min-h-screen bg-white text-gray-900">
        <SessionProvider>
          <header className="border-b border-gray-200">
            <nav className="max-w-4xl mx-auto px-6 py-4 flex gap-6 items-center">
              <Link href="/" className="font-semibold text-gray-900 hover:text-gray-600">
                GoodTribes.org
              </Link>
              <Link href="/about" className="text-gray-600 hover:text-gray-900">
                Om oss
              </Link>
              <Link href="/projects" className="text-gray-600 hover:text-gray-900">
                Projekt
              </Link>
              <Link href="/members" className="text-gray-600 hover:text-gray-900">
                Medlemmar
              </Link>
              <Link href="/links" className="text-gray-600 hover:text-gray-900">
                Länkar
              </Link>
              <AuthNav />
            </nav>
          </header>
          <main className="max-w-4xl mx-auto px-6 py-12">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
