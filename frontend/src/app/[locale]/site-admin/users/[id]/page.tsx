import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { isSiteOwner } from "@/lib/authz";
import { getGtBalance } from "@/lib/tokens";
import { setSuspended } from "../actions";
import SiteRoleSelect from "../SiteRoleSelect";
import Avatar from "../../Avatar";
import { lastActiveAt, nameKey, ROLE_LABEL } from "../userInfo";

const PROJECT_ROLE: Record<string, string> = { FOUNDER: "Grundare", ADMIN: "Projektledare", MEMBER: "Medlem", FOLLOWER: "Följer" };

// One member, everything an admin needs before acting: who they are, their
// projects and roles, tokens, latest activity, and other accounts that may be
// the same person. Role and suspension are changed here, in that context.
export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, t] = await Promise.all([auth(), getTranslations("SiteAdminUsers")]);
  const viewerIsOwner = !!session?.user?.id && (await isSiteOwner(session.user.id));

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, image: true, bio: true, siteRole: true, suspendedAt: true, createdAt: true,
      emailVerified: true, onboardingDone: true, showProfile: true,
      acceptedParticipantAgreementAt: true, acceptedCodeOfConductAt: true,
      sessions: { orderBy: { expires: "desc" }, take: 1, select: { expires: true } },
      projectMemberships: {
        orderBy: { joinedAt: "desc" },
        select: { role: true, joinedAt: true, project: { select: { slug: true, title: true, phase: true, isSandbox: true, hiddenAt: true } } },
      },
    },
  });
  if (!user) notFound();

  const [tribeTokens, gt, activity, sameName] = await Promise.all([
    prisma.tokenLedger.groupBy({ by: ["projectSlug"], where: { userId: id }, _sum: { tokens: true } }),
    getGtBalance(id),
    prisma.activityEvent.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, type: true, createdAt: true, project: { select: { slug: true, title: true } } },
    }),
    user.name
      ? prisma.user.findMany({ where: { id: { not: id }, name: { equals: user.name.trim(), mode: "insensitive" } }, select: { id: true, name: true, email: true } })
      : Promise.resolve([]),
  ]);
  const duplicates = sameName.filter((u) => nameKey(u.name) === nameKey(user.name));
  const tokensBySlug = new Map(tribeTokens.map((r) => [r.projectSlug, r._sum.tokens ?? 0]));
  const lastActive = lastActiveAt(user.sessions[0]?.expires);
  const date = (d: Date | null) => (d ? d.toLocaleDateString("sv-SE") : "—");

  return (
    <div className="max-w-4xl">
      <Link href="/site-admin/users" className="text-xs text-seagrass hover:underline">← Alla användare</Link>

      <div className="mt-3 flex flex-wrap items-start gap-4 rounded-2xl border border-dark-slate/10 bg-white p-5">
        <Avatar name={user.name} image={user.image} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-dark-slate">{user.name || "Inget namn än"}</h1>
            {user.suspendedAt && <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-600">{t("suspendedBadge")} {date(user.suspendedAt)}</span>}
          </div>
          <p className="text-sm text-dark-slate/60">{user.email}</p>
          {user.bio && <p className="mt-2 max-w-xl text-sm text-dark-slate/75">{user.bio}</p>}
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
            <Fact label="Gick med" value={date(user.createdAt)} />
            <Fact label="Senast aktiv" value={date(lastActive)} />
            <Fact label="E-post bekräftad" value={user.emailVerified ? "Ja" : "Nej"} />
            <Fact label="Godkänt avtal och uppförandekod" value={user.acceptedParticipantAgreementAt && user.acceptedCodeOfConductAt ? "Ja" : "Nej"} />
          </dl>
          {user.name && user.showProfile && (
            <Link href={`/members/${user.id}`} className="mt-3 inline-block text-xs text-seagrass hover:underline">Visa offentlig profil →</Link>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-xs text-dark-slate/60">
            Roll på sajten:
            {viewerIsOwner ? <SiteRoleSelect userId={user.id} initialRole={user.siteRole} /> : <span className="font-medium text-dark-slate">{ROLE_LABEL[user.siteRole]}</span>}
          </div>
          {!viewerIsOwner && <p className="text-[11px] text-dark-slate/45">{t("ownerOnlyNotice")}</p>}
          <form
            action={async () => {
              "use server";
              await setSuspended(user.id, !user.suspendedAt);
            }}
          >
            <button
              type="submit"
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                user.suspendedAt ? "border-seagrass text-seagrass hover:bg-seagrass/5" : "border-red-200 text-red-600 hover:bg-red-50"
              }`}
            >
              {user.suspendedAt ? t("reactivate") : t("suspend")}
            </button>
          </form>
        </div>
      </div>

      {duplicates.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Kanske samma person</p>
          <p className="text-xs">Andra konton med samma namn. Inget slås ihop automatiskt.</p>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {duplicates.map((d) => (
              <li key={d.id}>
                <Link href={`/site-admin/users/${d.id}`} className="text-xs underline">{d.name} · {d.email}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dark-slate/50">Projekt ({user.projectMemberships.length})</h2>
        {user.projectMemberships.length ? (
          <ul className="mt-2 divide-y divide-dark-slate/5 rounded-xl border border-dark-slate/10 bg-white">
            {user.projectMemberships.map((m) => (
              <li key={m.project.slug} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <Link href={`/projects/${m.project.slug}`} className="min-w-0 flex-1 truncate font-medium text-dark-slate hover:underline">{m.project.title}</Link>
                {m.project.hiddenAt && <span className="text-[10px] font-semibold text-red-600">Dold</span>}
                {m.project.isSandbox && <span className="text-[10px] text-dark-slate/45">Drömfabriken</span>}
                <span className="w-28 text-xs text-dark-slate/65">{PROJECT_ROLE[m.role] ?? m.role}</span>
                <span className="w-24 text-right text-xs text-dark-slate/65">{(tokensBySlug.get(m.project.slug) ?? 0).toLocaleString("sv-SE")} TT</span>
                <span className="w-24 text-right text-xs text-dark-slate/45">{date(m.joinedAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-dark-slate/50">Inte med i något projekt än.</p>
        )}
        <p className="mt-2 text-xs text-dark-slate/50">GoodTribes Token: <span className="font-semibold text-dark-slate">{gt.toLocaleString("sv-SE")} GT</span></p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dark-slate/50">Senaste aktivitet</h2>
        {activity.length ? (
          <ul className="mt-2 divide-y divide-dark-slate/5 rounded-xl border border-dark-slate/10 bg-white">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2 text-xs">
                <span className="w-20 shrink-0 text-dark-slate/45">{date(a.createdAt)}</span>
                <span className="text-dark-slate/75">{a.type.replace(/_/g, " ")}</span>
                {a.project && <Link href={`/projects/${a.project.slug}`} className="truncate text-seagrass hover:underline">{a.project.title}</Link>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-dark-slate/50">Ingen aktivitet än.</p>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-dark-slate/45">{label}</dt>
      <dd className="font-medium text-dark-slate/80">{value}</dd>
    </div>
  );
}
