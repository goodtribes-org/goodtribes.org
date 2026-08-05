import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/authz";
import { setSuspended } from "./actions";
import SiteRoleSelect from "./SiteRoleSelect";
import InviteUserForm from "./InviteUserForm";
import CreateUserForm from "./CreateUserForm";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth();
  const viewerIsOwner = !!session?.user?.id && (await isSiteOwner(session.user.id));

  const [users, allSkills] = await Promise.all([
    prisma.user.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      select: { id: true, name: true, email: true, siteRole: true, suspendedAt: true, showProfile: true },
      orderBy: { name: "asc" },
      take: 50,
    }),
    prisma.skill.findMany({ orderBy: [{ tag: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">Användare</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Hantera sajt-roller och avstängningar. {viewerIsOwner ? "" : "Endast ägare kan utse sajt-administratörer."}
        </p>
      </div>

      <InviteUserForm />
      <CreateUserForm allSkills={allSkills} />

      <form className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Sök namn eller e-post…"
          className="w-full max-w-sm border border-muted-teal/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
        />
      </form>

      <div className="border border-muted-teal/30 rounded-xl divide-y divide-muted-teal/15">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              {u.name && u.showProfile ? (
                <Link href={`/members/${u.id}`} className="text-sm font-medium text-dark-slate hover:text-seagrass hover:underline truncate block">
                  {u.name}
                </Link>
              ) : (
                <p className="text-sm font-medium text-dark-slate truncate">{u.name ?? "—"}</p>
              )}
              <p className="text-xs text-dark-slate/40 truncate">{u.email}</p>
            </div>
            {u.suspendedAt && (
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md">
                Avstängd
              </span>
            )}
            {viewerIsOwner ? (
              <SiteRoleSelect userId={u.id} initialRole={u.siteRole} />
            ) : (
              <span className="text-xs text-dark-slate/50">{u.siteRole}</span>
            )}
            <form
              action={async () => {
                "use server";
                await setSuspended(u.id, !u.suspendedAt);
              }}
            >
              <button
                type="submit"
                className="text-xs font-medium px-2 py-1 rounded-md border border-gray-200 text-dark-slate/70 hover:border-coral hover:text-coral transition-colors"
              >
                {u.suspendedAt ? "Återaktivera" : "Stäng av"}
              </button>
            </form>
          </div>
        ))}
        {users.length === 0 && (
          <p className="text-sm text-dark-slate/40 italic p-4">Inga användare hittades.</p>
        )}
      </div>
    </div>
  );
}
