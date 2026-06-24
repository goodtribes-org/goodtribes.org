import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import Link from "next/link";
import { acceptInvite } from "./actions";

const prisma = new PrismaClient();

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();

  const invite = await prisma.projectInvite.findUnique({
    where: { token },
    include: { project: { select: { title: true, slug: true } }, createdBy: { select: { name: true } } },
  });

  if (!invite) {
    return (
      <div className="max-w-md mx-auto mt-24 text-center">
        <p className="text-xl font-bold text-dark-slate mb-2">Invite not found</p>
        <p className="text-dark-slate/60 mb-6">This invite link is invalid or has expired.</p>
        <Link href="/projects" className="text-coral hover:underline">Browse projects →</Link>
      </div>
    );
  }

  if (invite.usedAt || invite.expiresAt < new Date()) {
    return (
      <div className="max-w-md mx-auto mt-24 text-center">
        <p className="text-xl font-bold text-dark-slate mb-2">Invite expired</p>
        <p className="text-dark-slate/60 mb-6">This invite has already been used or has expired.</p>
        <Link href="/projects" className="text-coral hover:underline">Browse projects →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-24">
      <div className="border border-muted-teal/40 rounded-xl p-8 text-center">
        <p className="text-sm text-dark-slate/50 mb-1">You've been invited by {invite.createdBy.name ?? "someone"}</p>
        <h1 className="text-2xl font-bold text-dark-slate mb-2">{invite.project.title}</h1>
        <p className="text-sm text-dark-slate/60 mb-8">Join as a collaborator and start contributing.</p>

        {session?.user?.id ? (
          <form action={acceptInvite.bind(null, token)}>
            <button
              type="submit"
              className="w-full bg-coral text-white font-semibold py-3 rounded-lg hover:bg-watermelon transition-colors"
            >
              Accept invitation →
            </button>
          </form>
        ) : (
          <Link
            href={`/login?callbackUrl=/invite/${token}`}
            className="block w-full bg-coral text-white font-semibold py-3 rounded-lg hover:bg-watermelon transition-colors"
          >
            Log in to accept →
          </Link>
        )}
      </div>
    </div>
  );
}
