import type { Viewport } from "next";
import { siteSansFont as inter } from "@/lib/fonts";
import "../globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#254441",
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`bg-white ${inter.className}`}>
      <body className="min-h-screen bg-white text-dark-slate">{children}</body>
    </html>
  );
}
