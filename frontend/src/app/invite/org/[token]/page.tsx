export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { acceptOrgInvite } from "./actions";


export default async function AcceptOrgInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { org: { select: { name: true, slug: true } } },
  });

  if (!invite) notFound();

  const expired = invite.expiresAt < new Date();
  const used = !!invite.usedAt;

  return (
    <div className="max-w-md mx-auto mt-16 text-center">
      <h1 className="text-2xl font-bold text-dark-slate mb-2">Organisation invitation</h1>

      {expired || used ? (
        <div className="mt-6 p-6 border border-muted-teal/30 rounded-lg">
          <p className="text-dark-slate/60 mb-4">
            {used ? "This invitation has already been used." : "This invitation has expired."}
          </p>
          <Link href="/org" className="text-coral hover:underline text-sm">
            Browse organisations →
          </Link>
        </div>
      ) : (
        <div className="mt-6 p-6 border border-muted-teal/30 rounded-lg">
          <p className="text-dark-slate/70 mb-2 text-sm">You&apos;ve been invited to join</p>
          <p className="text-xl font-bold text-dark-slate mb-6">{invite.org.name}</p>

          {session?.user?.id ? (
            <form action={acceptOrgInvite.bind(null, token)}>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-coral text-white font-bold rounded hover:bg-watermelon transition-colors"
              >
                Accept &amp; join →
              </button>
            </form>
          ) : (
            <div>
              <p className="text-sm text-dark-slate/60 mb-4">Log in to accept this invitation.</p>
              <Link
                href={`/login?callbackUrl=/invite/org/${token}`}
                className="inline-block px-6 py-3 bg-coral text-white font-bold rounded hover:bg-watermelon transition-colors"
              >
                Log in →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
