import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getAdminQueueCounts } from "@/lib/siteAdminCounts";
import { SITE_ADMIN_NAV } from "@/lib/siteAdminNav";
import Avatar from "./Avatar";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Where admin opens: what's waiting for someone, a few numbers, and who
// joined lately — instead of whichever queue happened to be first in the menu.
export default async function AdminOverviewPage() {
  const weekAgo = new Date(Date.now() - WEEK_MS);
  const [counts, users, newUsers, projects, newProjects, latest] = await Promise.all([
    getAdminQueueCounts(),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.project.count({ where: { hiddenAt: null } }),
    prisma.project.count({ where: { hiddenAt: null, createdAt: { gte: weekAgo } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    }),
  ]);
  const queues = SITE_ADMIN_NAV.filter((i) => i.count && counts[i.count] > 0);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-dark-slate">Översikt</h1>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dark-slate/50">Väntar på dig</h2>
        {queues.length ? (
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {queues.map((q) => (
              <li key={q.href}>
                <Link href={q.href} className="flex items-center justify-between rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 hover:border-coral/60">
                  <span className="text-sm font-medium text-dark-slate">{q.label}</span>
                  <span className="rounded-full bg-coral px-2.5 py-0.5 text-sm font-bold text-white">{counts[q.count!]}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-xl border border-dark-slate/10 bg-white px-4 py-3 text-sm text-dark-slate/60">Inget väntar just nu. ✓</p>
        )}
      </section>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Användare", users, `+${newUsers} senaste veckan`, "/site-admin/users"],
          ["Projekt", projects, `+${newProjects} senaste veckan`, "/site-admin/projects"],
        ].map(([label, n, sub, href]) => (
          <Link key={label as string} href={href as string} className="rounded-xl border border-dark-slate/10 bg-white px-4 py-3 hover:border-seagrass/50">
            <p className="text-xs text-dark-slate/50">{label}</p>
            <p className="text-2xl font-bold text-dark-slate">{n}</p>
            <p className="text-xs text-seagrass">{sub}</p>
          </Link>
        ))}
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dark-slate/50">Nya användare</h2>
          <Link href="/site-admin/users" className="text-xs text-seagrass hover:underline">Alla användare →</Link>
        </div>
        <ul className="mt-2 divide-y divide-dark-slate/5 rounded-xl border border-dark-slate/10 bg-white">
          {latest.map((u) => (
            <li key={u.id}>
              <Link href={`/site-admin/users/${u.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-dark-slate/[0.02]">
                <Avatar name={u.name} image={u.image} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-dark-slate">{u.name ?? "Inget namn än"}</span>
                  <span className="block truncate text-xs text-dark-slate/45">{u.email}</span>
                </span>
                <span className="shrink-0 text-xs text-dark-slate/45">{u.createdAt.toLocaleDateString("sv-SE")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
