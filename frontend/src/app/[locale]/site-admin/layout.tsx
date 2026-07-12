import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isSiteAdmin } from "@/lib/authz";

const NAV = [
  { href: "/site-admin/ethics", label: "Etikgranskning" },
  { href: "/site-admin/users", label: "Användare" },
  { href: "/site-admin/projects", label: "Projekt" },
];

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
        </nav>
      </div>
      {children}
    </div>
  );
}
