import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`bg-white ${inter.className}`}>
      <body className="min-h-screen bg-white text-dark-slate">{children}</body>
    </html>
  );
}
