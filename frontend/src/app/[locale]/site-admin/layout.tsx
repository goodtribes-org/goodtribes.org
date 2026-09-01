import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isSiteAdmin } from "@/lib/authz";
import { countPendingImpactReports } from "@/lib/impactReports";

const NAV = [
  { href: "/site-admin/ethics", label: "Etikgranskning" },
  { href: "/site-admin/content-flags", label: "Innehållsflaggor" },
  { href: "/site-admin/suggestions", label: "Förbättringsförslag" },
  { href: "/site-admin/users", label: "Användare" },
  { href: "/site-admin/projects", label: "Projekt" },
  { href: "/site-admin/organisations", label: "Organisationer" },
  { href: "/site-admin/token-backfill", label: "Token-bakfyllning" },
  { href: "/site-admin/council", label: "Granskningsråd" },
  { href: "/site-admin/sandbox-graduation", label: "Drömfabriken-ansökningar" },
  { href: "/site-admin/impact-reports", label: "Impact-rapporter" },
  { href: "/site-admin/legal-type", label: "Juridisk form" },
  { href: "/site-admin/profit-distribution", label: "Vinstfördelning" },
  { href: "/site-admin/impact-fund", label: "Impact-fond" },
  { href: "/site-admin/hero-carousel", label: "Startsidan" },
  { href: "/site-admin/sandbox-hero", label: "Drömfabriken" },
  { href: "/site-admin/site-copy", label: "Sidtexter" },
  { href: "/site-admin/shop", label: "Shop" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id || !(await isSiteAdmin(session.user.id))) {
    notFound();
  }

  // A review queue nobody can see the depth of is a queue nobody works —
  // impact reports are submitted by projects and then just sit there until an
  // admin happens to open the page.
  const pendingImpactReports = await countPendingImpactReports();

  return (
    <div>
      <div className="border-b border-muted-teal/30 mb-6">
        <nav className="max-w-4xl mx-auto px-4 flex gap-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-dark-slate/60 hover:text-dark-slate py-3 transition-colors"
            >
              {item.label}
              {item.href === "/site-admin/impact-reports" && pendingImpactReports > 0 && (
                <span className="ml-1.5 text-[10px] font-bold bg-coral text-white rounded-full px-1.5 py-0.5 align-middle">
                  {pendingImpactReports}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
