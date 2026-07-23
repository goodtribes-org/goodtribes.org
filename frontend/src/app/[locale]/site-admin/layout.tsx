import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isSiteAdmin } from "@/lib/authz";

const NAV = [
  { href: "/site-admin/ethics", label: "Etikgranskning" },
  { href: "/site-admin/content-flags", label: "Innehållsflaggor" },
  { href: "/site-admin/suggestions", label: "Förbättringsförslag" },
  { href: "/site-admin/users", label: "Användare" },
  { href: "/site-admin/projects", label: "Projekt" },
  { href: "/site-admin/organisations", label: "Organisationer" },
  { href: "/site-admin/token-backfill", label: "Token-bakfyllning" },
  { href: "/site-admin/council", label: "Granskningsråd" },
  { href: "/site-admin/legal-type", label: "Juridisk form" },
  { href: "/site-admin/profit-distribution", label: "Vinstfördelning" },
  { href: "/site-admin/impact-fund", label: "Impact-fond" },
];

// Strapi owns editorial copy (About/Privacy/Terms, see CLAUDE.md) via its
// own admin UI — no in-app editor here, just a way to reach it. The
// ingress routes /admin on the same host straight to the Strapi backend
// (see chart/templates/ingress.yaml), so a plain relative link works in
// production; in local dev, use http://localhost:1337/admin directly
// instead (Strapi runs on its own port there, not behind a shared proxy).
const STRAPI_ADMIN_HREF = "/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id || !(await isSiteAdmin(session.user.id))) {
    notFound();
  }

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
            </Link>
          ))}
          <a
            href={STRAPI_ADMIN_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-dark-slate/60 hover:text-dark-slate py-3 transition-colors"
          >
            Strapi ↗
          </a>
        </nav>
      </div>
      {children}
    </div>
  );
}
