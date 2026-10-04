import { getTranslations } from "next-intl/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import InviteUserForm from "./InviteUserForm";
import CreateUserForm from "./CreateUserForm";
import Avatar from "../Avatar";
import { lastActiveAt, possibleDuplicateIds, ROLE_LABEL } from "./userInfo";

const FILTERS = {
  alla: "Alla",
  admin: "Admin och ägare",
  avstangda: "Avstängda",
  "utan-namn": "Utan namn",
  dubbletter: "Möjliga dubbletter",
} as const;
type Filter = keyof typeof FILTERS;

const SORTS = { nyast: "Nyast först", namn: "Namn", aktiv: "Senast aktiv" } as const;
type Sort = keyof typeof SORTS;

// All members as a table: who they are, their site role, how many projects,
// when they joined and were last active. Changing a role or suspending
// someone happens on the person's own page (users/[id]), with their context.
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const filter: Filter = sp.filter && sp.filter in FILTERS ? (sp.filter as Filter) : "alla";
  const sort: Sort = sp.sort && sp.sort in SORTS ? (sp.sort as Sort) : "nyast";
  const t = await getTranslations("SiteAdminUsers");

  const where: Prisma.UserWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
    ...(filter === "admin" ? { siteRole: { in: ["ADMIN", "OWNER"] } } : {}),
    ...(filter === "avstangda" ? { suspendedAt: { not: null } } : {}),
    ...(filter === "utan-namn" ? { OR: [{ name: null }, { name: "" }] } : {}),
  };

  const [rows, duplicates, allSkills, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, image: true, siteRole: true, suspendedAt: true, createdAt: true,
        _count: { select: { projectMemberships: { where: { role: { not: "FOLLOWER" } } } } },
        sessions: { orderBy: { expires: "desc" }, take: 1, select: { expires: true } },
      },
      orderBy: sort === "namn" ? { name: "asc" } : { createdAt: "desc" },
      take: 200,
    }),
    possibleDuplicateIds(),
    prisma.skill.findMany({ orderBy: [{ tag: "asc" }, { name: "asc" }] }),
    prisma.user.count(),
  ]);

  let users = rows.map((u) => ({ ...u, lastActive: lastActiveAt(u.sessions[0]?.expires) }));
  if (filter === "dubbletter") users = users.filter((u) => duplicates.has(u.id));
  if (sort === "aktiv") users.sort((a, b) => (b.lastActive?.getTime() ?? 0) - (a.lastActive?.getTime() ?? 0));

  const href = (next: { filter?: Filter; sort?: Sort }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const f = next.filter ?? filter;
    const s = next.sort ?? sort;
    if (f !== "alla") p.set("filter", f);
    if (s !== "nyast") p.set("sort", s);
    const qs = p.toString();
    return `/site-admin/users${qs ? `?${qs}` : ""}`;
  };
  const date = (d: Date | null) => (d ? d.toLocaleDateString("sv-SE") : "—");

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
          <p className="mt-1 text-sm text-dark-slate/60">{total} konton. Klicka på någon för att se mer, ändra roll eller stänga av.</p>
        </div>
        <details className="group relative">
          <summary className="cursor-pointer list-none rounded-full bg-seagrass px-4 py-2 text-sm font-semibold text-white hover:bg-seagrass/90">+ Lägg till användare</summary>
          <div className="absolute right-0 z-20 mt-2 w-[min(32rem,90vw)] rounded-2xl border border-dark-slate/10 bg-white p-4 shadow-xl">
            <p className="mb-2 text-sm font-semibold text-dark-slate">Bjud in via e-post</p>
            <InviteUserForm />
            <CreateUserForm allSkills={allSkills} />
          </div>
        </details>
      </div>

      <form className="mt-5 flex flex-wrap items-center gap-2">
        {filter !== "alla" && <input type="hidden" name="filter" value={filter} />}
        {sort !== "nyast" && <input type="hidden" name="sort" value={sort} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t("searchPlaceholder")}
          className="w-full max-w-xs rounded-lg border border-muted-teal/40 px-3 py-2 text-sm focus:border-seagrass focus:outline-none"
        />
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FILTERS) as Filter[]).map((f) => (
            <Link
              key={f}
              href={href({ filter: f })}
              className={`rounded-full px-3 py-1 text-xs ${f === filter ? "bg-dark-slate text-white" : "border border-dark-slate/15 text-dark-slate/65 hover:border-dark-slate/40"}`}
            >
              {FILTERS[f]}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-dark-slate/50">
          Sortera:
          {(Object.keys(SORTS) as Sort[]).map((s) => (
            <Link key={s} href={href({ sort: s })} className={`rounded px-1.5 py-0.5 ${s === sort ? "font-semibold text-dark-slate" : "hover:text-dark-slate"}`}>
              {SORTS[s]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-dark-slate/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-dark-slate/10 text-xs text-dark-slate/50">
            <tr>
              <th className="px-4 py-2 font-medium">Person</th>
              <th className="px-3 py-2 font-medium">Roll</th>
              <th className="px-3 py-2 text-right font-medium">Projekt</th>
              <th className="px-3 py-2 font-medium">Gick med</th>
              <th className="px-3 py-2 font-medium">Senast aktiv</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-slate/5">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-dark-slate/[0.02]">
                <td className="px-4 py-2.5">
                  <Link href={`/site-admin/users/${u.id}`} className="flex items-center gap-3">
                    <Avatar name={u.name} image={u.image} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium text-dark-slate hover:underline">{u.name || "Inget namn än"}</span>
                        {u.suspendedAt && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">{t("suspendedBadge")}</span>}
                        {duplicates.has(u.id) && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Möjlig dubblett</span>}
                      </span>
                      <span className="block truncate text-xs text-dark-slate/45">{u.email}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-xs text-dark-slate/70">{ROLE_LABEL[u.siteRole]}</td>
                <td className="px-3 py-2.5 text-right text-dark-slate/70">{u._count.projectMemberships || "—"}</td>
                <td className="px-3 py-2.5 text-xs text-dark-slate/60">{date(u.createdAt)}</td>
                <td className="px-3 py-2.5 text-xs text-dark-slate/60">{date(u.lastActive)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="p-4 text-sm italic text-dark-slate/40">{t("noUsersFound")}</p>}
      </div>
    </div>
  );
}
