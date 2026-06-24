import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import AuthNav from "@/components/AuthNav";
import SearchInput from "@/components/SearchInput";
import NotificationBell from "@/components/NotificationBell";

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
    <html lang="en" className="bg-white">
      <body className="min-h-screen bg-white text-dark-slate">
        <SessionProvider>
          <header className="border-b border-muted-teal">
            <nav className="max-w-6xl mx-auto px-6 py-4 flex gap-6 items-center">
              <Link href="/" className="mr-auto">
                <Image
                  src="/img/GoodTribes1.png"
                  alt="GoodTribes.org"
                  height={52}
                  width={208}
                  className="object-contain"
                />
              </Link>
              <Link href="/projects" className="text-dark-slate/70 hover:text-seagrass">
                Projects
              </Link>
              <Link href="/ideas" className="text-dark-slate/70 hover:text-seagrass">
                Ideas
              </Link>
              <div className="relative group">
                <button className="flex items-center gap-1 text-dark-slate/70 hover:text-seagrass">
                  Work With Us
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mt-0.5">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="absolute top-full left-0 mt-1 hidden group-hover:block bg-white border border-muted-teal rounded-md shadow-md py-1 min-w-40 z-50">
                  <Link href="/members" className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-yellow-50">
                    Members
                  </Link>
                  <Link href="/org" className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-yellow-50">
                    Organisations
                  </Link>
                  <Link href="/skill" className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-yellow-50">
                    Skills
                  </Link>
                </div>
              </div>
              <Link href="/about" className="text-dark-slate/70 hover:text-seagrass">
                About
              </Link>
              <SearchInput />
              <NotificationBell />
              <AuthNav />
            </nav>
          </header>
          <main className="max-w-6xl mx-auto px-6 py-12">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
