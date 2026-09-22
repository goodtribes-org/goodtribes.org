import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isSiteAdmin } from "@/lib/authz";
import { countPendingImpactReports } from "@/lib/impactReports";
import { SITE_ADMIN_NAV } from "@/lib/siteAdminNav";


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
          {SITE_ADMIN_NAV.map((item) => (
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
