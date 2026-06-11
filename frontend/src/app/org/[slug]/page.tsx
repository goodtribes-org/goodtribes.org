import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requestToJoin } from "./actions";

const prisma = new PrismaClient();

export default async function OrgDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const org = await prisma.organisation.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!org) notFound();
  if (!org.isPublic && org.ownerId !== userId) notFound();

  const isOwner = org.ownerId === userId;
  const isMember = org.members.some((m) => m.userId === userId);

  const joinRequest = userId && !isOwner && !isMember
    ? await prisma.organisationJoinRequest.findUnique({
        where: { organisationId_userId: { organisationId: org.id, userId } },
      })
    : null;

  return (
    <div className="max-w-2xl">
      <div className="flex items-start gap-6 mb-8">
        <div className="w-20 h-20 rounded-lg bg-dry-sage flex-shrink-0 overflow-hidden">
          {org.imageUrl ? (
            <img src={org.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-dark-slate/30">
              🏢
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold">{org.name}</h1>
            {!org.isPublic && (
              <span className="text-xs bg-dry-sage text-dark-slate px-2 py-1 rounded">Privat</span>
            )}
          </div>
          <p className="text-sm text-dark-slate/60">
            Grundad av {org.owner.name ?? org.owner.email}
          </p>
        </div>
        {isOwner && (
          <Link
            href={`/org/${slug}/edit`}
            className="flex-shrink-0 text-sm text-coral hover:text-seagrass underline underline-offset-4"
          >
            Redigera
          </Link>
        )}
      </div>

      {org.description && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-2">
            Om organisationen
          </h2>
          <p className="text-dark-slate">{org.description}</p>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-3">
          Medlemmar ({org.members.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {org.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate">
                {m.user.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <span className="text-sm text-dark-slate">{m.user.name ?? "Namnlös"}</span>
              {m.role === "owner" && (
                <span className="text-xs text-muted-teal">Ägare</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {userId && !isOwner && !isMember && (
        <form action={requestToJoin} className="mt-6">
          <input type="hidden" name="orgId" value={org.id} />
          <button
            type="submit"
            disabled={!!joinRequest}
            className="px-4 py-2 rounded bg-coral text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {joinRequest ? "Begäran skickad" : "Begär medlemskap"}
          </button>
        </form>
      )}
    </div>
  );
}
